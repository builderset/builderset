package com.example.builder.library;

/** A file written to storage under a key of ours, with what was learnt from its bytes. */
public record StoredFile(
    String key, FileType type, int size, Integer width, Integer height, String sha256) {}
