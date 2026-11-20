package com.example.builder.shared;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.NoRepositoryBean;

/** The finders every revision table has. */
@NoRepositoryBean
public interface RevisionRepository<P extends DocumentEntity, R extends Revision<P>>
    extends JpaRepository<R, Long> {

  /** The editor's list, newest first. */
  List<R> findByParentOrderByCreatedAtDescIdDesc(P parent, Limit limit);

  Optional<R> findByParentAndUuid(P parent, UUID uuid);

  /** Whether an autosave was kept since: they are kept at most every ten minutes. */
  boolean existsByParentAndKindAndCreatedAtAfter(P parent, RevisionKind kind, Instant since);
}
