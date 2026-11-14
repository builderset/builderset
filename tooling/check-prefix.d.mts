/** Every Tailwind class in `folders` that lacks the `bst:` prefix, as `path:line  tokens`. */
export function unprefixedClasses(packageDir: string, folders: string[]): Promise<string[]>;
