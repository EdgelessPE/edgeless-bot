export type StringOrArrayOfStringsOrAnArrayOfArrayOfStrings =
  | string
  | [StringOrArrayOfStrings, ...StringOrArrayOfStrings[]];
/**
 * This interface was referenced by `undefined`'s JSON-Schema definition
 * via the `patternProperty` "^(.*)$".
 */
export type StringOrArrayOfStrings = string | [string, ...string[]];
export type Checkver =
  | string
  | {
      github?: string;
      /**
       * Same as 'regex'
       */
      re?: string;
      regex?: string;
      url?: string;
      /**
       * Same as 'jsonpath'
       */
      jp?: string;
      jsonpath?: JsonPathPattern;
      xpath?: string;
      /**
       * Reverse the order of regex matches
       */
      reverse?: boolean;
      /**
       * Allows rearrange the regexp matches
       */
      replace?: string;
      useragent?: string;
      /**
       * Custom PowerShell script to retrieve application version using more complex approach.
       */
      script?: string | [string, ...string[]];
      sourceforge?:
        | string
        | {
            project?: string;
            path?: string;
          };
    };
export type JsonPathPattern = string;
export type Hash = HashPattern | [HashPattern, ...HashPattern[]];
export type HashPattern = string;
export type ShortcutsArray = [
  (
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
  ),
  ...(
    | [string, string]
    | [string, string, string]
    | [string, string, string, string]
  )[],
];
export type Uninstaller = {
  [k: string]: unknown;
};
export type UriOrArrayOfUris = string | [string, ...string[]];
export type HashExtractionOrArrayOfHashExtractions =
  | HashExtraction
  | [HashExtraction, ...HashExtraction[]];
export type AutoupdateUriOrArrayOfAutoupdateUris =
  | string
  | [string, ...string[]];
export type License =
  | LicenseIdentifiers
  | {
      url?: string;
      identifier: LicenseIdentifiers;
    };
/**
 * License identifier based on SPDX License List https://spdx.org/licenses/
 */
export type LicenseIdentifiers = string;

export interface ScoopAppManifestSchema {
  $schema?: string;
  /**
   * Deprecated. Use ## instead.
   */
  _comment?: string | [string, ...string[]];
  /**
   * A comment.
   */
  "##"?: string | [string, ...string[]];
  architecture?: {
    "32bit"?: Architecture;
    "64bit"?: Architecture;
    arm64?: Architecture;
  };
  autoupdate?: Autoupdate;
  bin?: StringOrArrayOfStringsOrAnArrayOfArrayOfStrings;
  persist?: StringOrArrayOfStringsOrAnArrayOfArrayOfStrings;
  checkver?: Checkver;
  /**
   * Undocumented: Found at https://github.com/se35710/scoop-java/search?l=JSON&q=cookie
   */
  cookie?: {
    [k: string]: unknown;
  };
  depends?: StringOrArrayOfStrings;
  description?: string;
  env_add_path?: StringOrArrayOfStrings;
  env_set?: {
    [k: string]: unknown;
  };
  extract_dir?: StringOrArrayOfStrings;
  extract_to?: StringOrArrayOfStrings;
  hash?: Hash;
  homepage: string;
  /**
   * True if the installer InnoSetup based. Found in https://github.com/ScoopInstaller/Main/search?l=JSON&q=innosetup
   */
  innosetup?: boolean;
  installer?: Installer;
  license: License;
  /**
   * Deprecated
   */
  msi?: string | [string, ...string[]];
  notes?: StringOrArrayOfStrings;
  post_install?: StringOrArrayOfStrings;
  post_uninstall?: StringOrArrayOfStrings;
  pre_install?: StringOrArrayOfStrings;
  pre_uninstall?: StringOrArrayOfStrings;
  psmodule?: {
    name?: string;
  };
  shortcuts?: ShortcutsArray;
  suggest?: {
    [k: string]: StringOrArrayOfStrings;
  };
  uninstaller?: Uninstaller;
  url?: UriOrArrayOfUris;
  version: string;
}
export interface Architecture {
  bin?: StringOrArrayOfStringsOrAnArrayOfArrayOfStrings;
  checkver?: Checkver;
  env_add_path?: StringOrArrayOfStrings;
  env_set?: {
    [k: string]: unknown;
  };
  extract_dir?: StringOrArrayOfStrings;
  hash?: Hash;
  installer?: Installer;
  /**
   * Deprecated
   */
  msi?: string | [string, ...string[]];
  post_install?: StringOrArrayOfStrings;
  post_uninstall?: StringOrArrayOfStrings;
  pre_install?: StringOrArrayOfStrings;
  pre_uninstall?: StringOrArrayOfStrings;
  shortcuts?: ShortcutsArray;
  uninstaller?: Uninstaller;
  url?: UriOrArrayOfUris;
}
export interface Installer {
  /**
   * Undocumented: only used in scoop-extras/oraclejdk* and scoop-extras/appengine-go
   */
  _comment?: string;
  args?: StringOrArrayOfStrings;
  file?: string;
  script?: StringOrArrayOfStrings;
  keep?: boolean;
}
export interface Autoupdate {
  architecture?: {
    "32bit"?: AutoupdateArch;
    "64bit"?: AutoupdateArch;
    arm64?: AutoupdateArch;
  };
  bin?: StringOrArrayOfStringsOrAnArrayOfArrayOfStrings;
  env_add_path?: StringOrArrayOfStrings;
  env_set?: {
    [k: string]: unknown;
  };
  extract_dir?: StringOrArrayOfStrings;
  hash?: HashExtractionOrArrayOfHashExtractions;
  installer?: {
    file?: string;
  };
  license?: License;
  notes?: StringOrArrayOfStrings;
  persist?: StringOrArrayOfStringsOrAnArrayOfArrayOfStrings;
  psmodule?: {
    name?: string;
  };
  shortcuts?: ShortcutsArray;
  url?: AutoupdateUriOrArrayOfAutoupdateUris;
}
export interface AutoupdateArch {
  bin?: StringOrArrayOfStringsOrAnArrayOfArrayOfStrings;
  env_add_path?: StringOrArrayOfStrings;
  env_set?: {
    [k: string]: unknown;
  };
  extract_dir?: StringOrArrayOfStrings;
  hash?: HashExtractionOrArrayOfHashExtractions;
  installer?: {
    file?: string;
  };
  shortcuts?: ShortcutsArray;
  url?: AutoupdateUriOrArrayOfAutoupdateUris;
}
export interface HashExtraction {
  /**
   * Same as 'regex'
   */
  find?: string;
  regex?: string;
  /**
   * Same as 'jsonpath'
   */
  jp?: string;
  jsonpath?: JsonPathPattern;
  xpath?: string;
  mode?:
    | "download"
    | "extract"
    | "json"
    | "xpath"
    | "rdf"
    | "metalink"
    | "fosshub"
    | "sourceforge";
  /**
   * Deprecated, hash type is determined automatically
   */
  type?: "md5" | "sha1" | "sha256" | "sha512";
  url?: string;
}
