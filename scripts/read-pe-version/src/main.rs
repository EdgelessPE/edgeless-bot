use std::env;
use std::fs;
use std::process::ExitCode;

const RT_VERSION: u32 = 16;
const FIXED_INFO_SIGNATURE: u32 = 0xFEEF_04BD;

fn read_u16(data: &[u8], offset: usize) -> Option<u16> {
    let bytes = data.get(offset..offset.checked_add(2)?)?;
    Some(u16::from_le_bytes([bytes[0], bytes[1]]))
}

fn read_u32(data: &[u8], offset: usize) -> Option<u32> {
    let bytes = data.get(offset..offset.checked_add(4)?)?;
    Some(u32::from_le_bytes([bytes[0], bytes[1], bytes[2], bytes[3]]))
}

fn rva_to_offset(
    data: &[u8],
    sections_offset: usize,
    section_count: u16,
    rva: u32,
) -> Option<usize> {
    for index in 0..usize::from(section_count) {
        let section = sections_offset.checked_add(index.checked_mul(40)?)?;
        let virtual_address = read_u32(data, section.checked_add(12)?)?;
        let raw_size = read_u32(data, section.checked_add(16)?)?;
        let raw_offset = read_u32(data, section.checked_add(20)?)?;
        if rva < virtual_address {
            continue;
        }
        let delta = rva - virtual_address;
        if delta >= raw_size {
            continue;
        }
        let offset = usize::try_from(raw_offset.checked_add(delta)?).ok()?;
        data.get(offset)?;
        return Some(offset);
    }
    None
}

fn resource_offset(
    data: &[u8],
    resource_base: usize,
    resource_size: u32,
    relative_offset: u32,
    length: usize,
) -> Option<usize> {
    let relative = usize::try_from(relative_offset).ok()?;
    let resource_length = usize::try_from(resource_size).ok()?;
    if relative.checked_add(length)? > resource_length {
        return None;
    }
    let offset = resource_base.checked_add(relative)?;
    data.get(offset..offset.checked_add(length)?)?;
    Some(offset)
}

fn find_resource_entry(
    data: &[u8],
    resource_base: usize,
    resource_size: u32,
    directory_relative: u32,
    wanted_id: u32,
    match_id: bool,
) -> Option<u32> {
    let directory = resource_offset(data, resource_base, resource_size, directory_relative, 16)?;
    let named_count = u32::from(read_u16(data, directory.checked_add(12)?)?);
    let id_count = u32::from(read_u16(data, directory.checked_add(14)?)?);
    let entry_count = named_count.checked_add(id_count)?;

    for index in 0..entry_count {
        let relative = directory_relative
            .checked_add(16)?
            .checked_add(index.checked_mul(8)?)?;
        let entry = resource_offset(data, resource_base, resource_size, relative, 8)?;
        let name = read_u32(data, entry)?;
        let target = read_u32(data, entry.checked_add(4)?)?;
        if match_id && ((name & 0x8000_0000) != 0 || (name & 0xFFFF) != wanted_id) {
            continue;
        }
        return Some(target);
    }
    None
}

fn find_version_blob(data: &[u8]) -> Option<(usize, usize)> {
    let pe = usize::try_from(read_u32(data, 0x3C)?).ok()?;
    if data.get(pe..pe.checked_add(4)?)? != b"PE\0\0" {
        return None;
    }

    let section_count = read_u16(data, pe.checked_add(6)?)?;
    let optional_size = usize::from(read_u16(data, pe.checked_add(20)?)?);
    let optional = pe.checked_add(24)?;
    let directories = match read_u16(data, optional)? {
        0x10B => optional.checked_add(96)?,
        0x20B => optional.checked_add(112)?,
        _ => return None,
    };
    let optional_end = optional.checked_add(optional_size)?;
    if directories.checked_add(24)? > optional_end {
        return None;
    }

    let resource_rva = read_u32(data, directories.checked_add(16)?)?;
    let resource_size = read_u32(data, directories.checked_add(20)?)?;
    if resource_rva == 0 || resource_size == 0 {
        return None;
    }

    let sections = optional_end;
    let resource_base = rva_to_offset(data, sections, section_count, resource_rva)?;
    let resource_type =
        find_resource_entry(data, resource_base, resource_size, 0, RT_VERSION, true)?;
    if resource_type & 0x8000_0000 == 0 {
        return None;
    }
    let name = find_resource_entry(
        data,
        resource_base,
        resource_size,
        resource_type & 0x7FFF_FFFF,
        0,
        false,
    )?;
    if name & 0x8000_0000 == 0 {
        return None;
    }
    let language = find_resource_entry(
        data,
        resource_base,
        resource_size,
        name & 0x7FFF_FFFF,
        0,
        false,
    )?;
    if language & 0x8000_0000 != 0 {
        return None;
    }

    let entry = resource_offset(data, resource_base, resource_size, language, 16)?;
    let version_rva = read_u32(data, entry)?;
    let blob_size = usize::try_from(read_u32(data, entry.checked_add(4)?)?).ok()?;
    if blob_size == 0 {
        return None;
    }
    let blob_offset = rva_to_offset(data, sections, section_count, version_rva)?;
    data.get(blob_offset..blob_offset.checked_add(blob_size)?)?;
    Some((blob_offset, blob_size))
}

fn parse_version_blob(data: &[u8], blob: usize, blob_size: usize) -> Option<[u16; 4]> {
    let length = usize::from(read_u16(data, blob)?);
    let value_length = usize::from(read_u16(data, blob.checked_add(2)?)?);
    if length == 0 || length > blob_size || value_length < 52 {
        return None;
    }

    let mut relative = 6_usize;
    loop {
        if relative >= length {
            return None;
        }
        let character = read_u16(data, blob.checked_add(relative)?)?;
        relative = relative.checked_add(2)?;
        if character == 0 {
            break;
        }
    }
    relative = relative.checked_add(3)? & !3;
    if relative.checked_add(52)? > length {
        return None;
    }

    let fixed = blob.checked_add(relative)?;
    if read_u32(data, fixed)? != FIXED_INFO_SIGNATURE {
        return None;
    }
    let version_ms = read_u32(data, fixed.checked_add(8)?)?;
    let version_ls = read_u32(data, fixed.checked_add(12)?)?;
    Some([
        (version_ms >> 16) as u16,
        version_ms as u16,
        (version_ls >> 16) as u16,
        version_ls as u16,
    ])
}

fn read_file_version(data: &[u8]) -> Option<[u16; 4]> {
    let (blob, blob_size) = find_version_blob(data)?;
    parse_version_blob(data, blob, blob_size)
}

fn run() -> Result<(), String> {
    let mut arguments = env::args_os();
    let program = arguments.next().unwrap_or_default();
    let Some(file) = arguments.next() else {
        return Err(format!("Usage: {} <exe-or-dll>", program.to_string_lossy()));
    };
    if arguments.next().is_some() {
        return Err(format!("Usage: {} <exe-or-dll>", program.to_string_lossy()));
    }

    let data = fs::read(&file).map_err(|error| format!("Failed to open PE file: {error}"))?;
    let version = read_file_version(&data)
        .ok_or_else(|| "Failed to read PE fixed file version".to_string())?;
    println!(
        "{}.{}.{}.{}",
        version[0], version[1], version[2], version[3]
    );
    Ok(())
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("{error}");
            ExitCode::FAILURE
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{parse_version_blob, FIXED_INFO_SIGNATURE};

    fn write_u16(data: &mut [u8], offset: usize, value: u16) {
        data[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
    }

    fn write_u32(data: &mut [u8], offset: usize, value: u32) {
        data[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
    }

    fn version_blob() -> Vec<u8> {
        let mut data = vec![0_u8; 92];
        write_u16(&mut data, 0, 92);
        write_u16(&mut data, 2, 52);
        for (index, character) in "VS_VERSION_INFO\0".encode_utf16().enumerate() {
            write_u16(&mut data, 6 + index * 2, character);
        }
        write_u32(&mut data, 40, FIXED_INFO_SIGNATURE);
        write_u32(&mut data, 48, (1 << 16) | 2);
        write_u32(&mut data, 52, (3 << 16) | 4);
        data
    }

    #[test]
    fn parses_fixed_file_version() {
        assert_eq!(
            parse_version_blob(&version_blob(), 0, 92),
            Some([1, 2, 3, 4])
        );
    }

    #[test]
    fn rejects_an_invalid_signature() {
        let mut data = version_blob();
        write_u32(&mut data, 40, 0);
        assert_eq!(parse_version_blob(&data, 0, 92), None);
    }
}
