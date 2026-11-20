using System.Security.Claims;

namespace Builderset.Api.Auth;

/// <summary>
/// The signed-in person, as the routes need them. <see cref="Id"/> is
/// <c>app_user.id</c>, for the audit columns. A handler that takes an
/// <c>Actor</c> gets the signed-in user; one that takes <c>Actor?</c> may be
/// called by a visitor.
/// </summary>
public sealed record Actor(long Id, Guid Uuid, string Name)
{
    /// <summary>The person a principal stands for, or null when it is nobody's.</summary>
    public static Actor? From(ClaimsPrincipal? principal)
    {
        if (principal?.Identity?.IsAuthenticated != true) return null;
        var id = principal.FindFirstValue(AppClaims.UserId);
        var uuid = principal.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!long.TryParse(id, out var userId) || !Guid.TryParse(uuid, out var userUuid)) return null;
        return new Actor(userId, userUuid, principal.FindFirstValue(ClaimTypes.Name) ?? "");
    }

    /// <summary>How minimal APIs fill a handler's <c>Actor</c> parameter.</summary>
    public static ValueTask<Actor?> BindAsync(HttpContext http) => ValueTask.FromResult(From(http.User));
}

/// <summary>The claims the app reads, besides the standard id and name.</summary>
public static class AppClaims
{
    /// <summary><c>app_user.id</c>. Your sign-in adds it, in a claims transformation if it does not know it.</summary>
    public const string UserId = "app_user_id";

    /// <summary>Publishing is its own permission: a draft and a page in front of readers are different trust.</summary>
    public const string CanPublish = "can_publish";
}

public static class Policies
{
    /// <summary>Publish, unpublish, pause: what puts something in front of readers or takes it away.</summary>
    public const string Publish = "publish";
}

/// <summary>Who is signed in, for code that has no handler parameter to take it from.</summary>
public interface ICurrentUser
{
    Actor? Actor { get; }
}

public sealed class HttpCurrentUser(IHttpContextAccessor http) : ICurrentUser
{
    public Actor? Actor => Actor.From(http.HttpContext?.User);
}
