using System.Text.Json;
using Builderset.Api.Models;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Builderset.Api.Data;

/// <summary>
/// The tables of the SQL schema, mapped. EF Core reads and writes them; the SQL
/// files create them, with the partial unique indexes, the checks and the
/// touch trigger that every stack shares. Columns are snake_case by the naming
/// convention, so a property's name is its column's.
/// </summary>
public sealed class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<EmailTemplate> EmailTemplates => Set<EmailTemplate>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<Form> Forms => Set<Form>();
    public DbSet<FormResponse> FormResponses => Set<FormResponse>();
    public DbSet<CardDesign> CardDesigns => Set<CardDesign>();
    public DbSet<CardIssue> CardIssues => Set<CardIssue>();
    public DbSet<Popup> Popups => Set<Popup>();
    public DbSet<PopupSubmission> PopupSubmissions => Set<PopupSubmission>();
    public DbSet<SavedSection> SavedSections => Set<SavedSection>();
    public DbSet<Media> Media => Set<Media>();
    public DbSet<Activity> Activity => Set<Activity>();

    protected override void ConfigureConventions(ModelConfigurationBuilder conventions)
    {
        // Every document, fragment and detail is jsonb, stored as it came.
        conventions.Properties<JsonElement>().HaveColumnType("jsonb");
    }

    protected override void OnModelCreating(ModelBuilder model)
    {
        model.Entity<AppUser>().ToTable("app_user");
        // One configuration class per group of tables, in Models/.
        model.ApplyConfigurationsFromAssembly(typeof(AppDb).Assembly);
    }
}

public static class DatabaseErrors
{
    /// <summary>
    /// Postgres refused a duplicate: an address a partial unique index already
    /// holds. <paramref name="index"/> narrows it to one index.
    /// </summary>
    public static bool IsUniqueViolation(this DbUpdateException failure, string? index = null) =>
        failure.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation } refused
        && (index is null || refused.ConstraintName == index);
}
