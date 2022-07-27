module.exports = {
	parser: "@typescript-eslint/parser",
	parserOptions: {
		jsx: true,
		project: ["./tsconfig.json"],
	},
	plugins: ["@typescript-eslint", "prettier"],
	extends: [
		"eslint:recommended",
		"plugin:@typescript-eslint/eslint-recommended",
		"plugin:@typescript-eslint/recommended",
		"prettier",
	],
	rules: {
		"prettier/prettier": [
			"warn",
			{
				semi: true,
				trailingComma: "all",
				singleQuote: false,
				printWidth: 120,
				tabWidth: 4,
				useTabs: true,
			},
		],
		"@typescript-eslint/array-type": [
			"warn",
			{
				"default": "generic",
				"readonly": "generic"
			}
		],
		"no-restricted-imports": 0,
		"@typescript-eslint/no-unused-vars": "warn",
		"@typescript-eslint/explicit-function-return-type": "off",
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/no-empty-function": "off",
		"@typescript-eslint/no-empty-interface": "Off",
		"@typescript-eslint/no-namespace": "off",
		"@typescript-eslint/no-non-null-assertion": "off",
		"@typescript-eslint/no-use-before-define": "off",
		"@typescript-eslint/explicit-module-boundary-types": "off",
		"@typescript-eslint/no-require-imports": "error",
		"@typescript-eslint/no-unused-expressions": "warn",
		"no-undef-init": "error",
		"prefer-const": 0,
		"@typescript-eslint/no-array-constructor": 0,
		"@typescript-eslint/ban-ts-comment":0
	},
};