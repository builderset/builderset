package com.example.builder.web;

import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * `?limit=&offset=`: a page of at most 100 rows, from any row. Spring Data's
 * PageRequest counts in whole pages, so this is the Pageable the lists pass.
 */
public record Paging(int limit, int offset, Sort sort) implements Pageable {

  public static Paging of(Integer limit, Integer offset, int defaultLimit) {
    int rows = limit == null ? defaultLimit : Math.clamp(limit, 1, 100);
    return new Paging(rows, offset == null ? 0 : Math.max(offset, 0), Sort.unsorted());
  }

  public Paging sortedBy(Sort order) {
    return new Paging(limit, offset, order);
  }

  @Override
  public int getPageNumber() {
    return offset / limit;
  }

  @Override
  public int getPageSize() {
    return limit;
  }

  @Override
  public long getOffset() {
    return offset;
  }

  @Override
  public Sort getSort() {
    return sort;
  }

  @Override
  public Pageable next() {
    return new Paging(limit, offset + limit, sort);
  }

  @Override
  public Pageable previousOrFirst() {
    return new Paging(limit, Math.max(offset - limit, 0), sort);
  }

  @Override
  public Pageable first() {
    return new Paging(limit, 0, sort);
  }

  @Override
  public Pageable withPage(int pageNumber) {
    return new Paging(limit, pageNumber * limit, sort);
  }

  @Override
  public boolean hasPrevious() {
    return offset > 0;
  }
}
