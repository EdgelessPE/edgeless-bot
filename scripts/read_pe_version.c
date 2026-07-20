#include <fcntl.h>
#include <stdbool.h>
#include <stdint.h>
#include <stdio.h>
#include <sys/mman.h>
#include <sys/stat.h>
#include <unistd.h>

#define RT_VERSION 16U
#define FIXED_INFO_SIGNATURE 0xFEEF04BDU

static bool range_ok(size_t size, size_t offset, size_t length) {
  return offset <= size && length <= size - offset;
}

static bool read_u16(const uint8_t *data, size_t size, size_t offset,
                     uint16_t *value) {
  if (!range_ok(size, offset, 2)) return false;
  *value = (uint16_t)data[offset] | ((uint16_t)data[offset + 1] << 8);
  return true;
}

static bool read_u32(const uint8_t *data, size_t size, size_t offset,
                     uint32_t *value) {
  if (!range_ok(size, offset, 4)) return false;
  *value = (uint32_t)data[offset] | ((uint32_t)data[offset + 1] << 8) |
           ((uint32_t)data[offset + 2] << 16) |
           ((uint32_t)data[offset + 3] << 24);
  return true;
}

static bool rva_to_offset(const uint8_t *data, size_t size,
                          size_t sections_offset, uint16_t section_count,
                          uint32_t rva, size_t *file_offset) {
  for (uint16_t index = 0; index < section_count; index++) {
    const size_t section = sections_offset + (size_t)index * 40;
    uint32_t virtual_address, raw_size, raw_offset;
    if (!read_u32(data, size, section + 12, &virtual_address) ||
        !read_u32(data, size, section + 16, &raw_size) ||
        !read_u32(data, size, section + 20, &raw_offset))
      return false;
    if (rva < virtual_address) continue;
    const uint32_t delta = rva - virtual_address;
    if (delta >= raw_size) continue;
    const size_t offset = (size_t)raw_offset + delta;
    if (!range_ok(size, offset, 1)) return false;
    *file_offset = offset;
    return true;
  }
  return false;
}

static bool resource_offset(size_t file_size, size_t resource_base,
                            uint32_t resource_size, uint32_t relative_offset,
                            size_t length, size_t *file_offset) {
  if ((uint64_t)relative_offset + length > resource_size) return false;
  const size_t offset = resource_base + relative_offset;
  if (!range_ok(file_size, offset, length)) return false;
  *file_offset = offset;
  return true;
}

static bool find_resource_entry(const uint8_t *data, size_t size,
                                size_t resource_base, uint32_t resource_size,
                                uint32_t directory_relative,
                                uint32_t wanted_id, bool match_id,
                                uint32_t *entry_target) {
  size_t directory;
  if (!resource_offset(size, resource_base, resource_size, directory_relative,
                       16, &directory))
    return false;
  uint16_t named_count, id_count;
  if (!read_u16(data, size, directory + 12, &named_count) ||
      !read_u16(data, size, directory + 14, &id_count))
    return false;
  const uint32_t entry_count = (uint32_t)named_count + id_count;
  for (uint32_t index = 0; index < entry_count; index++) {
    size_t entry;
    const uint32_t relative = directory_relative + 16 + index * 8;
    if (!resource_offset(size, resource_base, resource_size, relative, 8,
                         &entry))
      return false;
    uint32_t name, target;
    if (!read_u32(data, size, entry, &name) ||
        !read_u32(data, size, entry + 4, &target))
      return false;
    if (match_id && ((name & 0x80000000U) != 0 ||
                     (name & 0xFFFFU) != wanted_id))
      continue;
    *entry_target = target;
    return true;
  }
  return false;
}

static bool find_version_blob(const uint8_t *data, size_t size,
                              size_t *blob_offset, uint32_t *blob_size) {
  uint32_t pe_value;
  if (!read_u32(data, size, 0x3C, &pe_value)) return false;
  const size_t pe = pe_value;
  if (!range_ok(size, pe, 24) || data[pe] != 'P' || data[pe + 1] != 'E' ||
      data[pe + 2] != 0 || data[pe + 3] != 0)
    return false;

  uint16_t section_count, optional_size, magic;
  if (!read_u16(data, size, pe + 6, &section_count) ||
      !read_u16(data, size, pe + 20, &optional_size))
    return false;
  const size_t optional = pe + 24;
  if (!read_u16(data, size, optional, &magic)) return false;
  const size_t directories =
      magic == 0x10BU ? optional + 96
      : magic == 0x20BU ? optional + 112
                       : 0;
  if (directories == 0 || directories + 24 > optional + optional_size)
    return false;

  uint32_t resource_rva, resource_size;
  if (!read_u32(data, size, directories + 16, &resource_rva) ||
      !read_u32(data, size, directories + 20, &resource_size) ||
      resource_rva == 0 || resource_size == 0)
    return false;
  const size_t sections = optional + optional_size;
  size_t resource_base;
  if (!rva_to_offset(data, size, sections, section_count, resource_rva,
                     &resource_base))
    return false;

  uint32_t type, name, language;
  if (!find_resource_entry(data, size, resource_base, resource_size, 0,
                           RT_VERSION, true, &type) ||
      (type & 0x80000000U) == 0 ||
      !find_resource_entry(data, size, resource_base, resource_size,
                           type & 0x7FFFFFFFU, 0, false, &name) ||
      (name & 0x80000000U) == 0 ||
      !find_resource_entry(data, size, resource_base, resource_size,
                           name & 0x7FFFFFFFU, 0, false, &language) ||
      (language & 0x80000000U) != 0)
    return false;

  size_t entry;
  if (!resource_offset(size, resource_base, resource_size, language, 16,
                       &entry))
    return false;
  uint32_t version_rva;
  return read_u32(data, size, entry, &version_rva) &&
         read_u32(data, size, entry + 4, blob_size) && *blob_size > 0 &&
         rva_to_offset(data, size, sections, section_count, version_rva,
                       blob_offset) &&
         range_ok(size, *blob_offset, *blob_size);
}

static bool print_file_version(const uint8_t *data, size_t size) {
  size_t blob;
  uint32_t blob_size;
  if (!find_version_blob(data, size, &blob, &blob_size)) return false;
  uint16_t length, value_length;
  if (!read_u16(data, size, blob, &length) ||
      !read_u16(data, size, blob + 2, &value_length) || length == 0 ||
      length > blob_size || value_length < 52)
    return false;

  size_t relative = 6;
  uint16_t character = 1;
  while (character != 0 && relative < length) {
    if (!read_u16(data, size, blob + relative, &character)) return false;
    relative += 2;
  }
  relative = (relative + 3U) & ~3U;
  if (relative + 52 > length) return false;
  const size_t fixed = blob + relative;
  uint32_t signature, version_ms, version_ls;
  if (!read_u32(data, size, fixed, &signature) ||
      signature != FIXED_INFO_SIGNATURE ||
      !read_u32(data, size, fixed + 8, &version_ms) ||
      !read_u32(data, size, fixed + 12, &version_ls))
    return false;
  printf("%u.%u.%u.%u\n", version_ms >> 16, version_ms & 0xFFFFU,
         version_ls >> 16, version_ls & 0xFFFFU);
  return true;
}

int main(int argc, char **argv) {
  if (argc != 2) {
    fprintf(stderr, "Usage: read-pe-version <exe-or-dll>\n");
    return 2;
  }
  const int file = open(argv[1], O_RDONLY);
  if (file < 0) {
    perror("Failed to open PE file");
    return 1;
  }
  struct stat status;
  if (fstat(file, &status) != 0 || status.st_size <= 0) {
    fprintf(stderr, "Failed to inspect PE file\n");
    close(file);
    return 1;
  }
  const size_t size = (size_t)status.st_size;
  const uint8_t *data = mmap(NULL, size, PROT_READ, MAP_PRIVATE, file, 0);
  if (data == MAP_FAILED) {
    perror("Failed to map PE file");
    close(file);
    return 1;
  }
  const bool success = print_file_version(data, size);
  if (!success) fprintf(stderr, "Failed to read PE fixed file version\n");
  munmap((void *)data, size);
  close(file);
  return success ? 0 : 1;
}
