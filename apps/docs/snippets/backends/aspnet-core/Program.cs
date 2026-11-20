using System.Text.Json;
using Builderset.Api;
using Builderset.Api.Audit;
using Builderset.Api.Auth;
using Builderset.Api.Checks;
using Builderset.Api.Data;
using Builderset.Api.Http;
using Builderset.Api.Models;
using Builderset.Api.Routes;
using Builderset.Api.Storage;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
var services = builder.Services;
var configuration = builder.Configuration;

// ── The database, and who writes to it ───────────────────────────────────────
services.AddHttpContextAccessor();
services.AddScoped<ICurrentUser, HttpCurrentUser>();
services.AddScoped<AuditInterceptor>();
services.AddDbContext<AppDb>((provider, options) => options
    .UseNpgsql(configuration.GetConnectionString("Builderset"))
    .UseSnakeCaseNamingConvention()
    .AddInterceptors(provider.GetRequiredService<AuditInterceptor>()));
services.AddScoped<AuditTrail>();

// ── The checks: the schemas here, the kits' rules in the checker ──────────────
services.AddSingleton<KitSchemas>();
services.AddScoped<DocumentChecks>();
services.AddHttpClient<CheckerClient>(checker =>
{
    checker.BaseAddress = new Uri(configuration["Checker:Url"] ?? "http://127.0.0.1:4319/");
    checker.Timeout = TimeSpan.FromSeconds(2);
});

// ── The five builders: one set of routes, five row types ─────────────────────
services.AddSingleton(Kinds.Emails);
services.AddSingleton(Kinds.Articles);
services.AddSingleton(Kinds.Forms);
services.AddSingleton(Kinds.Cards);
services.AddSingleton(Kinds.Popups);
services.AddScoped(typeof(Documents<,>));
services.AddSingleton<FileStore>();

// ── Who is signed in, and what went wrong ────────────────────────────────────
services.AddAuthentication(DevAuthentication.SchemeName)
    .AddScheme<AuthenticationSchemeOptions, DevAuthentication>(
        DevAuthentication.SchemeName, null);
services.AddAuthorizationBuilder()
    .AddPolicy(Policies.Publish, policy => policy.RequireClaim(AppClaims.CanPublish, "true"));
services.AddProblemDetails();
services.AddExceptionHandler<ProblemsHandler>();
services.AddVisitorLimits();

// The API's JSON is snake_case, as the editor and the data model write it.
services.ConfigureHttpJsonOptions(json =>
    json.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower);

// A document is JSON of any size until it is checked: refuse a body larger
// than any real document before it is read. Uploads raise it for themselves.
builder.WebHost.ConfigureKestrel(kestrel => kestrel.Limits.MaxRequestBodySize = 2 * 1024 * 1024);

// Behind a proxy (a load balancer, a PaaS), the visitor's address is in
// X-Forwarded-For. Name your proxies in KnownProxies or KnownNetworks.
services.Configure<ForwardedHeadersOptions>(forwarded =>
    forwarded.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto);

var app = builder.Build();

app.UseForwardedHeaders();
app.UseExceptionHandler();
app.UseStatusCodePages();

// Uploaded files, by key: the documents hold the key, never this URL.
var files = app.Services.GetRequiredService<FileStore>();
Directory.CreateDirectory(files.Directory);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(files.Directory),
    RequestPath = FileStore.UrlPath,
});

app.UseAuthentication();
app.UseAuthorization();
app.UseRateLimiter();

// ── Visitors: no sign-in ─────────────────────────────────────────────────────
var visitors = app.MapGroup("/api/public");
visitors.MapPublicForms();
visitors.MapPublicPopups();
visitors.MapPublicArticles();

// ── Your team: everything else ───────────────────────────────────────────────
var team = app.MapGroup("/api").RequireAuthorization();
team.MapUploads();

team.MapDocuments<EmailTemplate, EmailTemplateRevision>(Kinds.Emails);
team.MapHistory<EmailTemplate, EmailTemplateRevision>(Kinds.Emails);
team.MapSections(Kinds.Emails.Path, Kit.Email);
team.MapEmailDelivery();

team.MapDocuments<Article, ArticleRevision>(Kinds.Articles);
team.MapHistory<Article, ArticleRevision>(Kinds.Articles);
team.MapSections(Kinds.Articles.Path, Kit.Article);

team.MapDocuments<Form, FormRevision>(Kinds.Forms);
team.MapHistory<Form, FormRevision>(Kinds.Forms);
team.MapSections(Kinds.Forms.Path, Kit.Form);
team.MapFormResponses();

team.MapDocuments<CardDesign, CardDesignRevision>(Kinds.Cards);
team.MapHistory<CardDesign, CardDesignRevision>(Kinds.Cards);
team.MapCardIssues();

team.MapDocuments<Popup, PopupRevision>(Kinds.Popups);
team.MapHistory<Popup, PopupRevision>(Kinds.Popups);
team.MapPopupPause();

app.Run();
