// Nep Package
interface NepPackage {
    "nep": string,
    "package": {
        "name": string,
        "template": string,
        "version": string,
        "authors": string[],
        "licence"?: string
    },
    "software": {
        "upstream": string,
        "category": string,
        "main_program": string
    }
}

// Nep Workflow
interface NepWorkflow {
    [key: string]: NepStepLink | NepStepExecute | NepStepPath | NepStepLog
}

interface NepStepHeader {
    name: string
    step: string
    if?: string
}

type NepStepLink = {
    source_file: string
    target_name: string
} & NepStepHeader

type NepStepExecute = {
    command: string
    pwd?: string
} & NepStepHeader

type NepStepPath = {
    record: string
} & NepStepHeader

type NepStepLog = {
    level: string
    msg: string
} & NepStepHeader


export {
    NepPackage,
    NepWorkflow
}