#!/bin/bash
# Basic bash library for console work.
# V1.00
# Kit Cochrane

message() {
    echo -e "\033[0mSYSTEM: $*"
    clear_format
}

success() {
    echo -e "\033[32;1mSUCCESS\033[22m: $*"
    clear_format
}

warn() {
    echo -e "\033[36;1mWARNING\033[22m: $*"
}

warn_prompt() {
    echo -en "\033[36;1mWARNING\033[22m: $*"
}

throw() {
    echo -e "\033[31;1mERROR $1\033[22m: $2"
    clean_exit $1
}

newl() {
    echo -e "\n"
}

clear_format() {
    echo -en "\033[0m"
}

#function to check if a command is installed
check_install() {
    #run command and check for path
    message "Checking for $1..."
    if ! command -v $1>>/dev/null; then
        throw 3 "$1 could not be located and is required. Please verify $1 install before running this script."
        return 1
    else
        success "$1 found at $(command -v $1)!"
        return 0
    fi
}

#function to check exit status of last command and throw error if failed
exit_check() {
    #check last exit status
    if [ $? != 0 ]; then
        throw 2 $1 " Operation returned $?."
        return 1
    else
        success $2
        return 0
    fi
}

#function to remove given path recursively with no warnings verbose
remove() {
    warn "Removing $1..."
    rm -rfv $1

    #validate
    return $(exit_check "Unable to delete $1" "$1 removed!")
}

#function to clear formatting and exit with message
clean_exit() {
    message "Exiting with code $1"
    clear_format
    exit $1
}
