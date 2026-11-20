package com.example.builder.checks;

import com.example.builder.web.Issue;
import com.fasterxml.jackson.databind.JsonNode;
import com.networknt.schema.JsonSchema;
import com.networknt.schema.JsonSchemaFactory;
import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SpecVersion;
import com.networknt.schema.ValidationMessage;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * The first layer: each kit's JSON Schema, checked in-process. A document that
 * is not the kit's shape is refused here, before the checker is asked. The
 * files are the kits' own `schema.json`, copied into src/main/resources/schemas
 * by copy-schemas.sh.
 */
@Component
public class DocumentSchemas {

  /** Enough to show where a document went wrong; a broken tree can fail thousands of rules. */
  private static final int MOST_ISSUES = 20;

  private final Map<Kit, JsonSchema> documents = new EnumMap<>(Kit.class);
  private final Map<Kit, JsonSchema> nodes = new EnumMap<>(Kit.class);

  public DocumentSchemas() {
    JsonSchemaFactory factory = JsonSchemaFactory.getInstance(SpecVersion.VersionFlag.V202012);
    for (Kit kit : Kit.values()) {
      String file = "classpath:schemas/" + kit.value() + ".schema.json";
      documents.put(kit, factory.getSchema(SchemaLocation.of(file)));
      // A saved section's nodes are read against the same element rules as a document's.
      nodes.put(kit, factory.getSchema(SchemaLocation.of(file + "#/properties/nodes")));
    }
  }

  /** What is wrong with the document's shape; empty when it is the kit's. */
  public List<Issue> problems(Kit kit, JsonNode document) {
    return issuesOf(documents.get(kit).validate(document));
  }

  /** The same for a fragment's `nodes`. */
  public List<Issue> nodeProblems(Kit kit, JsonNode fragmentNodes) {
    return issuesOf(nodes.get(kit).validate(fragmentNodes));
  }

  /**
   * One issue per place. A node that fails is named once, on its block: the
   * schema tries it against every element type and gives a reason for each,
   * which say nothing more to the person editing it.
   */
  private static List<Issue> issuesOf(Set<ValidationMessage> messages) {
    Map<String, Issue> byPlace = new LinkedHashMap<>();
    for (ValidationMessage message : messages) {
      String path = pathOf(message);
      String[] parts = path.split("\\.", 3);
      if (parts.length >= 2 && parts[0].equals("nodes")) {
        byPlace.putIfAbsent(
            "nodes." + parts[1], new Issue("error", "document.malformed", parts[1], null, null));
      } else {
        byPlace.putIfAbsent(path, Issue.error("document.malformed", path));
      }
    }
    return byPlace.values().stream().limit(MOST_ISSUES).toList();
  }

  /** `$.nodes.root.props.width` as the editor's dotted path: `nodes.root.props.width`. */
  private static String pathOf(ValidationMessage message) {
    String path = message.getInstanceLocation().toString();
    return path.startsWith("$.") ? path.substring(2) : "";
  }
}
