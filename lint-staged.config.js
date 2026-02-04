module.exports = {
    '*.{ts,tsx}': [
        'eslint --fix',
        'jest --bail --findRelatedTests --passWithNoTests'
    ],
    '*.{json,md}': [
        'prettier --write --ignore-unknown'
    ]
};
