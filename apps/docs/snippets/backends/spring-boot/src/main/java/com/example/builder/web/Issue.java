package com.example.builder.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.Map;

/**
 * One problem with a document, as the editor reads it: it shows each on its
 * block by `nodeId` and jumps to the field by `path`. The kits name these in
 * camelCase, so this record is not snake_cased like the rest of the API.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public record Issue(
    String severity, String code, String nodeId, String path, Map<String, Object> params) {

  public static Issue error(String code, String path) {
    return new Issue("error", code, null, path, null);
  }
}
