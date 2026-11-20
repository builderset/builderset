package com.example.builder.library;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Uploaded files on the local disk. A real project keeps them in S3 or
 * similar; only this class changes, because a document holds a file's key,
 * never its URL.
 */
@Component
public class Storage {

  private final Path root;

  public Storage(@Value("${builderset.uploads.dir}") Path root) {
    this.root = root.toAbsolutePath();
  }

  /** Where the browser gets a key's bytes: WebConfig serves the folder there. */
  public String urlOf(String key) {
    return "/api/uploads/" + key;
  }

  /** Store the bytes under a key of ours: a client's file name never becomes a path. */
  public StoredFile store(byte[] bytes, FileType type, String sha256) {
    YearMonth month = YearMonth.now(ZoneOffset.UTC);
    String key =
        "%d/%02d/%s.%s"
            .formatted(month.getYear(), month.getMonthValue(), UUID.randomUUID(), type.extension());
    try {
      Path path = root.resolve(key);
      Files.createDirectories(path.getParent());
      Files.write(path, bytes);
    } catch (IOException failure) {
      throw new UncheckedIOException(failure);
    }
    int[] size = type.dimensions(bytes);
    return new StoredFile(
        key,
        type,
        bytes.length,
        size == null ? null : size[0],
        size == null ? null : size[1],
        sha256);
  }
}
