<?php

namespace App\Builderset;

/**
 * A problem with a document, in the shape the editor reads: it shows each
 * one on its block (`nodeId`) and field (`path`), in the editor's own words
 * for its `code`.
 */
final class Issue
{
    public static function error(
        string $code,
        ?string $path = null,
        ?string $nodeId = null,
        array $params = [],
    ): array {
        return array_filter(
            ['severity' => 'error', 'code' => $code, 'nodeId' => $nodeId, 'path' => $path,
                'params' => $params === [] ? null : $params],
            fn ($value) => $value !== null,
        );
    }
}
