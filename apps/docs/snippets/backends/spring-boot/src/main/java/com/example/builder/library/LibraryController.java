package com.example.builder.library;

import com.example.builder.documents.DocumentKinds;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** Saved sections, per builder, and uploads. */
@RestController
public class LibraryController {

  private final DocumentKinds kinds;
  private final Library library;

  public LibraryController(DocumentKinds kinds, Library library) {
    this.kinds = kinds;
    this.library = library;
  }

  @GetMapping("/api/{kind}/sections")
  List<Library.SectionAnswer> sections(@PathVariable String kind) {
    return library.sections(kinds.get(kind).kit());
  }

  @PostMapping("/api/{kind}/sections")
  @ResponseStatus(HttpStatus.CREATED)
  Library.SectionAnswer saveSection(
      @PathVariable String kind, @RequestBody Library.SectionRequest request) {
    return library.saveSection(kinds.get(kind).kit(), request);
  }

  @DeleteMapping("/api/{kind}/sections/{sid}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  void deleteSection(@PathVariable String kind, @PathVariable UUID sid) {
    library.deleteSection(kinds.get(kind).kit(), sid);
  }

  /** Larger than spring.servlet.multipart.max-file-size: 413, before it is read. */
  @PostMapping("/api/uploads")
  @ResponseStatus(HttpStatus.CREATED)
  Library.MediaAnswer upload(@RequestParam MultipartFile file, @RequestParam String kind)
      throws IOException {
    return library.upload(file.getBytes(), file.getOriginalFilename(), kind);
  }
}
