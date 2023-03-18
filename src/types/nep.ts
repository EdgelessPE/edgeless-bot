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
        "scope": string,
        "upstream": string,
        "category": string,
        "main_program"?: string
    }
}

// Nep Workflow
interface NepWorkflow {
    [key: string]: NepStepLink | NepStepExecute | NepStepPath | NepStepLog
}

interface NepStepHeader {
    name: string
    if?: string
}

type NepStepLink = {
    step:"Link"
    source_file: string
    target_name: string
} & NepStepHeader

type NepStepExecute = {
    step:"Execute"
    command: string
    pwd?: string
} & NepStepHeader

type NepStepPath = {
    step:"Path"
    record: string
} & NepStepHeader

type NepStepLog = {
    step:"Log"
    level: string
    msg: string
} & NepStepHeader


export {
    NepPackage,
    NepWorkflow
}