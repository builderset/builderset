using System.Threading.RateLimiting;

namespace Builderset.Api.Http;

public static class RateLimits
{
    /// <summary>What a visitor may send: form responses and popup submissions.</summary>
    public const string Visitors = "visitors";

    /// <summary>
    /// Ten sends a minute per address, then 429: enough for a person, too few for
    /// a script. Behind a proxy the address is the visitor's only once
    /// <c>UseForwardedHeaders</c> trusts it.
    /// </summary>
    public static IServiceCollection AddVisitorLimits(this IServiceCollection services) =>
        services.AddRateLimiter(limits =>
        {
            limits.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            limits.AddPolicy(Visitors, http => RateLimitPartition.GetFixedWindowLimiter(
                http.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1) }));
        });
}
