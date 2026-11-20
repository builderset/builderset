package com.example.builder.library;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.util.Arrays;

/** The files the library takes, known by their first bytes, never by their name. -1 matches any byte. */
public enum FileType {
  PNG("image/png", Media.Kind.IMAGE, "png", 0x89, 0x50, 0x4e, 0x47),
  JPEG("image/jpeg", Media.Kind.IMAGE, "jpg", 0xff, 0xd8, 0xff),
  GIF("image/gif", Media.Kind.IMAGE, "gif", 0x47, 0x49, 0x46, 0x38),
  WEBP("image/webp", Media.Kind.IMAGE, "webp", 0x52, 0x49, 0x46, 0x46, -1, -1, -1, -1, 0x57, 0x45, 0x42, 0x50),
  MP4("video/mp4", Media.Kind.VIDEO, "mp4", -1, -1, -1, -1, 0x66, 0x74, 0x79, 0x70),
  WEBM("video/webm", Media.Kind.VIDEO, "webm", 0x1a, 0x45, 0xdf, 0xa3),
  MP3("audio/mpeg", Media.Kind.AUDIO, "mp3", 0x49, 0x44, 0x33),
  PDF("application/pdf", Media.Kind.FILE, "pdf", 0x25, 0x50, 0x44, 0x46);

  private final String mime;
  private final Media.Kind kind;
  private final String extension;
  private final int[] signature;

  FileType(String mime, Media.Kind kind, String extension, int... signature) {
    this.mime = mime;
    this.kind = kind;
    this.extension = extension;
    this.signature = signature;
  }

  /** The type the bytes are, or null when the library does not take them. */
  public static FileType of(byte[] bytes) {
    return Arrays.stream(values()).filter(type -> type.matches(bytes)).findFirst().orElse(null);
  }

  private boolean matches(byte[] bytes) {
    if (bytes.length < signature.length) return false;
    for (int i = 0; i < signature.length; i++) {
      if (signature[i] != -1 && signature[i] != (bytes[i] & 0xff)) return false;
    }
    return true;
  }

  /**
   * An image's size, from its header, so the editor can hold its space before
   * it loads. PNG and GIF say it in fixed places; for the rest, read it with
   * an image library such as ImageIO. Null when unknown.
   */
  public int[] dimensions(byte[] bytes) {
    ByteBuffer header = ByteBuffer.wrap(bytes);
    if (this == PNG && bytes.length >= 24) return new int[] {header.getInt(16), header.getInt(20)};
    if (this == GIF && bytes.length >= 10) {
      header.order(ByteOrder.LITTLE_ENDIAN);
      return new int[] {header.getShort(6) & 0xffff, header.getShort(8) & 0xffff};
    }
    return null;
  }

  public String mime() {
    return mime;
  }

  public Media.Kind kind() {
    return kind;
  }

  public String extension() {
    return extension;
  }
}
