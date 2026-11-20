package com.example.builder.shared;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.NoRepositoryBean;

/**
 * The finders every audited table has. Each names which side of a soft delete
 * it reads: the live rows, which is everything but the trash, or the trash,
 * which only its list and restore read. A deleted row is 404 everywhere else.
 */
@NoRepositoryBean
public interface AuditedRepository<E extends AuditedEntity>
    extends JpaRepository<E, Long>, JpaSpecificationExecutor<E> {

  /** A live row by its public id. */
  @Query("select t from #{#entityName} t where t.uuid = :uuid and t.deletedAt is null")
  Optional<E> findLive(UUID uuid);

  /** The same, locked until the transaction ends: what is checked is what is written. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from #{#entityName} t where t.uuid = :uuid and t.deletedAt is null")
  Optional<E> lockLive(UUID uuid);

  /** A row in the trash, locked: for restore. */
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select t from #{#entityName} t where t.uuid = :uuid and t.deletedAt is not null")
  Optional<E> lockDeleted(UUID uuid);
}
