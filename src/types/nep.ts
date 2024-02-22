// Nep Package
interface NepPackage {
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
interface NepWorkflow {
  [key: string]: NepStepLink | NepStepExecute | NepStepPath | NepStepLog;
}

interface NepStepHeader {
  name: string;
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

export { NepPackage, NepWorkflow };
