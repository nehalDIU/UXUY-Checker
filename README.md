# UXUY Text Checker Web App

A web application to find matching addresses between Invite Details (Main Data) and Referrer Addresses (User Input data).

## Project Overview

The UXUY Text Checker analyzes and validates Ethereum addresses by matching patterns between two sets of data:

1. **Invite Details** - The main source data with addresses and UXUY amounts
2. **Referrer Addresses** - User input addresses to be matched against the invite details

## Address Matching Features

The system uses a sophisticated pattern matching algorithm to identify matching addresses by comparing:

- The first 5 characters of the address (including 0x prefix)
- The last 4 characters of the address

This allows it to recognize various address patterns, including:

1. `0x11E******393F` - Standard masked format
2. `0x11E**393F` - Short masked format
3. `0x11E******************393F` - Long masked format
4. `0x11EbhdhG&TfvgbFVVtfBF393F` - Full address with special characters
5. `0x11EbhdhG&87642TfvgbFVVtfBF393F` - Full address with numbers and special characters

## Key Features

- **Pattern Recognition**: Efficiently matches addresses based on first 5 and last 4 characters
- **Duplicate Detection**: Identifies both exact and pattern-based duplicates
- **Visual Highlighting**: Clearly shows matching patterns in the UI
- **Filtering Options**: Filter results by UXUY amount 
- **Export Options**: Export results for documentation and analysis
- **Responsive Design**: Works well on both desktop and mobile devices

## Usage Guide

1. Enter Invite Details in the left text area (format: address + UXUY amount per line)
2. Enter Referrer Addresses in the right text area (format: one address per line)
3. Click "Analyze Results" to process the data
4. View the matches, duplicates, and analytics in the results section

## Recent Improvements

- Enhanced pattern matching algorithm to support more address formats
- Added advanced pattern visualization to highlight matching parts
- Improved duplicate detection for various address formats
- Updated UI with better explanations of the matching logic
- Optimized performance for handling large sets of addresses

## Technologies Used

- React.js
- TypeScript
- Tailwind CSS
- Vite 