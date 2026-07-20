#!/usr/bin/env python3

import sys

import pefile


def read_file_version(file_path: str) -> str:
    pe = pefile.PE(file_path, fast_load=False)
    try:
        fixed_info = getattr(pe, "VS_FIXEDFILEINFO", None)
        if not fixed_info:
            raise ValueError("PE file has no fixed version information")

        version_info = fixed_info[0]
        version_ms = version_info.FileVersionMS
        version_ls = version_info.FileVersionLS
        return ".".join(
            str(part)
            for part in (
                version_ms >> 16,
                version_ms & 0xFFFF,
                version_ls >> 16,
                version_ls & 0xFFFF,
            )
        )
    finally:
        pe.close()


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: read_pe_version.py <exe-or-dll>", file=sys.stderr)
        return 2

    try:
        print(read_file_version(sys.argv[1]))
    except Exception as error:
        print(f"Failed to read PE version: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
