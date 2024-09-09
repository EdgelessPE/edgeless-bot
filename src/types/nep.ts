// Nep Package
export interface NepPackage {
  nep: string;
  package: {
    name: string;
    template: string;
    description: string;
    version: string;
    authors: string[];
    license?: string;
  };
  software: {
    scope: string;
    upstream: string;
    category: string;
    language: string;
    main_program?: string;
    registry_entry?: string;
    tags?: string[];
  };
}

// Nep Workflow
export interface NepWorkflow {
  [key: string]:
    | NepStepLink
    | NepStepExecute
    | NepStepPath
    | NepStepLog
    | NepStepDownload;
}

interface NepStepHeader {
  name?: string;
  if?: string;
}

type NepStepLink = {
  step: "Link";
  source_file: string;
  target_name: string;
  target_args?: string;
  target_icon?: string;
  at?: string[];
} & NepStepHeader;

type NepStepExecute = {
  step: "Execute";
  command: string;
  pwd?: string;
  call_installer?: boolean;
  ignore_exit_code?: boolean;
} & NepStepHeader;

type NepStepPath = {
  step: "Path";
  record: string;
  alias?: string;
} & NepStepHeader;

type NepStepLog = {
  step: "Log";
  level: string;
  msg: string;
} & NepStepHeader;

type NepStepDownload = {
  step: "Download";
  url: string;
  hash_blake3: string;
} & NepStepHeader;
