<?php

namespace App\Builderset;

use Opis\JsonSchema\Errors\ErrorFormatter;
use Opis\JsonSchema\Validator;

/**
 * The first check, in this process: does the document have its kit's shape?
 * Each kit ships its JSON Schema in its npm package; install.sh copies them
 * to resources/schemas, from the same packages the checker runs, so the two
 * checks agree on the version.
 */
final class Schemas
{
    private const BASE = 'https://schemas.builderset.local/';

    private readonly Validator $validator;

    public function __construct(private readonly string $directory)
    {
        $this->validator = new Validator;
        // Each file is read once per process, the first time its kit is checked.
        $this->validator->resolver()->registerPrefix(self::BASE, $this->directory);
    }

    /** What is wrong with a document's shape, as issues; none when it fits. */
    public function documentIssues(string $kit, object $document): array
    {
        return $this->issues($document, self::BASE."{$kit}.schema.json");
    }

    /**
     * What is wrong with a saved section: `{ roots, nodes }`, where the nodes
     * are the kit's own elements, checked against the kit's node schema.
     */
    public function fragmentIssues(string $kit, object $fragment): array
    {
        $schema = (object) [
            'type' => 'object',
            'required' => ['roots', 'nodes'],
            'properties' => (object) [
                'roots' => (object) ['type' => 'array', 'minItems' => 1, 'items' => (object) ['type' => 'string']],
                'nodes' => (object) ['$ref' => self::BASE."{$kit}.schema.json#/properties/nodes"],
            ],
        ];
        $issues = $this->issues($fragment, $schema);
        foreach ($issues === [] ? $fragment->roots : [] as $root) {
            if (! isset($fragment->nodes->{$root})) {
                $issues[] = Issue::error('fragment.malformed', path: 'roots');
            }
        }

        return $issues;
    }

    private function issues(object $data, string|object $schema): array
    {
        $result = $this->validator->validate($data, $schema);
        if ($result->isValid()) {
            return [];
        }
        $issues = [];
        foreach ((new ErrorFormatter)->format($result->error(), false) as $pointer => $message) {
            $issues[] = self::issueAt($pointer, $message);
        }

        return $issues;
    }

    /** `/nodes/n3/props/href` becomes the block n3 and its field `href`, where the editor shows it. */
    private static function issueAt(string $pointer, string $message): array
    {
        $parts = array_values(array_filter(explode('/', $pointer), fn ($part) => $part !== ''));
        $params = ['message' => $message];
        if (($parts[0] ?? null) === 'nodes' && isset($parts[1])) {
            $field = ($parts[2] ?? null) === 'props' ? array_slice($parts, 3) : array_slice($parts, 2);

            return Issue::error('document.malformed', path: implode('.', $field) ?: null,
                nodeId: $parts[1], params: $params);
        }

        return Issue::error('document.malformed', path: implode('.', $parts) ?: null, params: $params);
    }
}
