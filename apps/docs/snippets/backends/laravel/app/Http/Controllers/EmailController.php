<?php

namespace App\Http\Controllers;

use App\Builderset\Checker;
use App\Enums\Status;
use App\Exceptions\ApiError;
use App\Models\EmailTemplate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * What your mailer sends: the live document, rendered on the server. The
 * browser never sends HTML. A test send of the draft is your mailer's too:
 * render `draft_document` the same way and send it to one address.
 */
final class EmailController extends Controller
{
    /** POST /api/emails/:id/send — `{ data, locale }`: the email, rendered for your mailer. */
    public function send(Request $request, Checker $checker, EmailTemplate $email): array
    {
        ['locale' => $locale] = $request->validate([
            'data' => ['nullable', 'array'],
            'locale' => ['nullable', 'string', 'max:10'],
        ]) + ['locale' => null];
        if ($email->status !== Status::Published) {
            throw ApiError::conflict('This email template is a draft: publish it before sending it.');
        }
        // The data as sent, objects as objects, like a document.
        $data = json_decode($request->getContent() ?: '{}', false)->data ?? (object) [];
        // An email is read far from your site: its files are linked by absolute URL.
        $assetBase = rtrim(Storage::disk('public')->url(''), '/').'/';
        $rendered = $checker->renderEmail($email->document, $data, $locale, $assetBase);

        return ['subject' => $rendered->subject, 'html' => $rendered->html, 'text' => $rendered->text];
    }
}
