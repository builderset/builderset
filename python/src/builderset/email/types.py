"""Every kind of email the system sends, as data.

An email TYPE is the event that sends it — "password reset", "application
approved", "newsletter". Each declares the variables the sending code puts in
its context, which of them a template must use (a reset email without the
reset link is not a reset email), and realistic samples for the editor's
preview. Templates are designed per type in the admin; this list is code,
because it describes what the CODE sends.

The variable names are exactly the context keys ``app/workers/handlers.py``
passes today, so moving a type from its Jinja file to a builder template
changes nothing on the sending side.
"""

from __future__ import annotations

from typing import Any, Literal, TypedDict


class VariableSpec(TypedDict, total=False):
    name: str
    label: dict[str, str]
    type: str
    required: bool
    example: Any
    fields: list[VariableSpec]
    children: list[VariableSpec]


class EmailTypeSpec(TypedDict, total=False):
    key: str
    label: dict[str, str]
    description: dict[str, str]
    category: str
    kind: Literal["transactional", "marketing"]
    variables: list[VariableSpec]
    mustUse: list[str]
    samples: dict[str, dict[str, Any]]


def _v(
    name: str, en: str, sq: str, de: str, kind: str = "string", *, required: bool = False
) -> VariableSpec:
    spec: VariableSpec = {"name": name, "label": {"en": en, "sq": sq, "de": de}, "type": kind}
    if required:
        spec["required"] = True
    return spec


_APPLICATION = [
    _v("code", "Application code", "Kodi i aplikimit", "Antragsnummer", required=True),
    _v("plate", "Plate", "Targa", "Kennzeichen", required=True),
    _v("year", "Car year", "Viti i makinës", "Baujahr", "number"),
]
_VALUATION = [
    _v("cash_price", "Cash price", "Çmimi cash", "Barpreis", "money"),
    _v("bank_price", "Bank price", "Çmimi me bankë", "Bankpreis", "money"),
    _v("checkpoint_name", "Checkpoint", "Pika", "Standort"),
    _v("checkpoint_address", "Checkpoint address", "Adresa e pikës", "Adresse des Standorts"),
    _v("checkpoint_phone", "Checkpoint phone", "Telefoni i pikës", "Telefon des Standorts"),
]
_APPLICATION_SAMPLE: dict[str, Any] = {
    "code": "APP-2026-00123",
    "plate": "AA 123 BB",
    "year": 2019,
}
_VALUATION_SAMPLE: dict[str, Any] = {
    "cash_price": "12500",
    "bank_price": "13200",
    "checkpoint_name": "Tirana Center",
    "checkpoint_address": "Rruga e Durrësit 12, Tiranë",
    "checkpoint_phone": "+355 69 000 0000",
}


def _label(en: str, sq: str, de: str) -> dict[str, str]:
    return {"en": en, "sq": sq, "de": de}


def _group(name: str, en: str, sq: str, de: str, children: list[VariableSpec]) -> VariableSpec:
    """An object variable — ``subscriber.email`` — whose children are the paths."""
    return {"name": name, "label": _label(en, sq, de), "type": "string", "children": children}


#: The car as the customer sent it — words, not codes (see ``handlers._car``).
_CAR: VariableSpec = _group(
    "car",
    "Car",
    "Mjeti",
    "Fahrzeug",
    [
        _v("brand", "Brand", "Marka", "Marke"),
        _v("model", "Model", "Modeli", "Modell"),
        _v("variant", "Variant", "Varianti", "Variante"),
        _v("odometer", "Mileage (km)", "Kilometrazhi", "Kilometerstand", "number"),
        _v("fuel", "Fuel", "Karburanti", "Kraftstoff"),
        _v("transmission", "Gearbox", "Kambio", "Getriebe"),
        _v("color", "Colour", "Ngjyra", "Farbe"),
    ],
)

#: The sender's own name and number, on the three "we have it" emails.
_PERSON: list[VariableSpec] = [
    _v("first_name", "First name", "Emri", "Vorname"),
    _v("full_name", "Full name", "Emri i plotë", "Vollständiger Name"),
    _v("phone", "Phone", "Telefoni", "Telefon"),
]

#: What the newsletter is filled with at send time — see
#: ``app/workers/handlers.py::email_newsletter``, which builds exactly this.
_NEWSLETTER: list[VariableSpec] = [
    _v("is_welcome", "Welcome email", "Email mirëseardhjeje", "Willkommens-E-Mail", "boolean"),
    _group(
        "subscriber",
        "Subscriber",
        "Abonenti",
        "Abonnent",
        [
            _v("email", "Email", "Email", "E-Mail", "email", required=True),
            _v("since", "Subscribed on", "Abonuar më", "Angemeldet am", "datetime"),
            _v("source", "Signed up on", "Abonuar nga", "Angemeldet über"),
        ],
    ),
    _group(
        "edition",
        "Edition",
        "Numri",
        "Ausgabe",
        [_v("label", "Month", "Muaji", "Monat", required=True)],
    ),
    _group(
        "site",
        "Site links",
        "Lidhjet e faqes",
        "Seitenlinks",
        [
            _v("blog_url", "Blog", "Blogu", "Blog", "url"),
            _v("valuation_url", "Valuation", "Vlerësimi", "Bewertung", "url"),
            _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
        ],
    ),
    _group(
        "market",
        "Market (30 days)",
        "Tregu (30 ditë)",
        "Markt (30 Tage)",
        [
            _v("valuations", "Cars valued", "Makina të vlerësuara", "Bewertete Autos", "number"),
            _v(
                "average_offer", "Average offer", "Oferta mesatare", "Durchschnittsangebot", "money"
            ),
            _v("top_brand", "Most asked brand", "Marka më e kërkuar", "Gefragteste Marke"),
        ],
    ),
    _v("articles_count", "Articles", "Artikuj", "Artikel", "number"),
    {
        "name": "articles",
        "label": _label("Latest articles", "Artikujt e fundit", "Neueste Artikel"),
        "type": "list",
        "fields": [
            _v("title", "Title", "Titulli", "Titel"),
            _v("excerpt", "Excerpt", "Përmbledhja", "Auszug"),
            _v("category", "Category", "Kategoria", "Kategorie"),
            _v("reading_minutes", "Reading time", "Koha e leximit", "Lesezeit", "number"),
            _v("published_at", "Published", "Publikuar", "Veröffentlicht", "date"),
            _v("url", "Link", "Lidhja", "Link", "url"),
        ],
    },
]

#: Mirrors ``NEWSLETTER_SAMPLE`` in ``packages/builder-presets/src/email-designs/newsletter.ts``.
_NEWSLETTER_SAMPLE: dict[str, Any] = {
    "subscriber": {
        "email": "arta@example.com",
        "since": "2026-09-28T09:14:00Z",
        "source": "home",
    },
    "is_welcome": True,
    "edition": {"label": "Tetor 2026"},
    "site": {
        "blog_url": "https://marrimauto.com/blog",
        "valuation_url": "https://marrimauto.com/valuation",
        "contact_url": "https://marrimauto.com/contact",
    },
    "market": {"valuations": 184, "average_offer": 8650, "top_brand": "Volkswagen"},
    "articles_count": 2,
    "articles": [
        {
            "title": "Sa vlen realisht makina ime?",
            "excerpt": (
                "Pesë gjërat që e ngrenë ose e ulin çmimin më shumë sesa kilometrat — "
                "dhe si t'i kontrolloni vetë para se të kërkoni një ofertë."
            ),
            "category": "Çmimet",
            "reading_minutes": 6,
            "url": "https://marrimauto.com/blog/sa-vlen-makina-ime",
        },
        {
            "title": "Dokumentet që ju duhen për ta shitur makinën",
            "excerpt": (
                "Leja e qarkullimit, siguracioni, kolaudimi: çfarë duhet të keni gati "
                "dhe çfarë mund të zgjidhet ditën e shitjes."
            ),
            "category": "Këshilla",
            "reading_minutes": 4,
            "url": "https://marrimauto.com/blog/dokumentet-per-shitje",
        },
    ],
}


EMAIL_TYPES: list[EmailTypeSpec] = [
    {
        "key": "application_received",
        "label": _label("Application received", "Aplikimi u mor", "Antrag eingegangen"),
        "category": "application",
        "kind": "transactional",
        "variables": [
            *_APPLICATION,
            _CAR,
            _v("district", "District", "Rrethi", "Bezirk"),
            _v("submitted_at", "Submitted", "Dërguar më", "Eingereicht", "datetime"),
            _group(
                "site",
                "Site links",
                "Lidhjet e faqes",
                "Seitenlinks",
                [
                    _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
                    _v("blog_url", "Blog", "Blogu", "Blog", "url"),
                ],
            ),
        ],
        "mustUse": ["code"],
        #: Mirrors ``APPLICATION_RECEIVED_SAMPLE`` in ``email-designs/application-received.ts``.
        "samples": {
            "default": {
                **_APPLICATION_SAMPLE,
                "car": {
                    "brand": "Volkswagen",
                    "model": "Golf",
                    "variant": "2.0 TDI",
                    "odometer": 148500,
                    "fuel": "Naftë",
                    "transmission": "Manuale",
                    "color": "Gri",
                },
                "district": "Tiranë",
                "submitted_at": "2026-10-02T19:35:00Z",
                "site": {
                    "contact_url": "https://marrimauto.com/contact",
                    "blog_url": "https://marrimauto.com/blog",
                },
            }
        },
    },
    {
        "key": "application_approved",
        "label": _label("Application approved", "Aplikimi u aprovua", "Antrag genehmigt"),
        "description": _label(
            "The offer — both prices and the inspection point — with the link to book.",
            "Oferta — dy çmimet dhe pika e kontrollit — me lidhjen për rezervim.",
            "Das Angebot — beide Preise und der Prüfstandort — mit dem Buchungslink.",
        ),
        "category": "application",
        "kind": "transactional",
        "variables": [
            *_APPLICATION,
            *_VALUATION,
            _v(
                "schedule_url",
                "Booking link",
                "Lidhja e rezervimit",
                "Buchungslink",
                "url",
                required=True,
            ),
            _v("link_days", "Link valid (days)", "Vlefshmëria (ditë)", "Gültig (Tage)", "number"),
            _v(
                "link_expires_at",
                "Link valid until",
                "Lidhja vlen deri më",
                "Link gültig bis",
                "datetime",
            ),
            _v("valuated_at", "Valued on", "Vlerësuar më", "Bewertet am", "datetime"),
            _CAR,
            _v("district", "District", "Rrethi", "Bezirk"),
            _group(
                "site",
                "Site links",
                "Lidhjet e faqes",
                "Seitenlinks",
                [
                    _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
                    _v("blog_url", "Blog", "Blogu", "Blog", "url"),
                ],
            ),
        ],
        "mustUse": ["schedule_url"],
        #: Mirrors ``VALUATION_OFFER_SAMPLE`` in ``email-designs/valuation-offer.ts``.
        "samples": {
            "default": {
                **_APPLICATION_SAMPLE,
                "cash_price": "12500.00",
                "bank_price": "13200.00",
                "checkpoint_name": "Tirana Center",
                "checkpoint_address": "Rruga e Durrësit 12, Tiranë",
                "checkpoint_phone": "+355 69 000 0000",
                "schedule_url": "https://marrimauto.com/offer/sample-token",
                "link_days": 14,
                "link_expires_at": "2026-10-16T19:35:00Z",
                "valuated_at": "2026-10-02T19:35:00Z",
                "car": {
                    "brand": "Volkswagen",
                    "model": "Golf",
                    "variant": "2.0 TDI",
                    "odometer": 148500,
                    "fuel": "Naftë",
                    "transmission": "Manuale",
                },
                "district": "Tiranë",
                "site": {
                    "contact_url": "https://marrimauto.com/contact",
                    "blog_url": "https://marrimauto.com/blog",
                },
            }
        },
    },
    {
        "key": "application_refused",
        "label": _label("Application refused", "Aplikimi u refuzua", "Antrag abgelehnt"),
        "description": _label(
            "The decision and its reason — before an offer, or once an inspection was booked.",
            "Vendimi dhe arsyeja — para ofertës, ose pasi u rezervua kontrolli.",
            "Die Entscheidung und ihr Grund — vor einem Angebot oder nach gebuchter Prüfung.",
        ),
        "category": "application",
        "kind": "transactional",
        "variables": [
            *_APPLICATION,
            _v("refusal_reason", "Reason", "Arsyeja", "Grund", required=True),
            # Where it was refused from: `pending` (before any offer) or
            # `scheduled` (an inspection was booked, and is now off). A design
            # shows the words for each with a display condition on it.
            _v("stage", "Refused at stage", "Refuzuar në fazën", "Abgelehnt in Phase"),
            _v("refused_at", "Refused on", "Refuzuar më", "Abgelehnt am", "datetime"),
            _CAR,
            _v("district", "District", "Rrethi", "Bezirk"),
            _group(
                "site",
                "Site links",
                "Lidhjet e faqes",
                "Seitenlinks",
                [
                    _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
                    _v("blog_url", "Blog", "Blogu", "Blog", "url"),
                    _v("valuation_url", "New valuation", "Vlerësim i ri", "Neue Bewertung", "url"),
                ],
            ),
        ],
        "mustUse": ["refusal_reason"],
        #: Mirror ``APPLICATION_REFUSED_SAMPLE`` and
        #: ``APPLICATION_REFUSED_AFTER_BOOKING_SAMPLE`` in
        #: ``email-designs/application-refused.ts``.
        "samples": {
            "default": {
                **_APPLICATION_SAMPLE,
                "refusal_reason": "Mjeti është më i vjetër se 15 vjet.",
                "stage": "pending",
                "refused_at": "2026-10-03T09:15:00Z",
                "car": {
                    "brand": "Volkswagen",
                    "model": "Golf",
                    "variant": "2.0 TDI",
                    "odometer": 148500,
                    "fuel": "Naftë",
                    "transmission": "Manuale",
                    "color": "Gri",
                },
                "district": "Tiranë",
                "site": {
                    "contact_url": "https://marrimauto.com/contact",
                    "blog_url": "https://marrimauto.com/blog",
                    "valuation_url": "https://marrimauto.com/valuation",
                },
            },
            "after_booking": {
                **_APPLICATION_SAMPLE,
                "refusal_reason": "Gjendja e mjetit nuk përputhet me të dhënat e aplikimit.",
                "stage": "scheduled",
                "refused_at": "2026-10-03T09:15:00Z",
                "car": {
                    "brand": "Volkswagen",
                    "model": "Golf",
                    "variant": "2.0 TDI",
                    "odometer": 148500,
                    "fuel": "Naftë",
                    "transmission": "Manuale",
                    "color": "Gri",
                },
                "district": "Tiranë",
                "site": {
                    "contact_url": "https://marrimauto.com/contact",
                    "blog_url": "https://marrimauto.com/blog",
                    "valuation_url": "https://marrimauto.com/valuation",
                },
            },
        },
    },
    {
        "key": "appointment_confirmed",
        "label": _label("Appointment confirmed", "Takimi u konfirmua", "Termin bestätigt"),
        "category": "appointment",
        "kind": "transactional",
        "variables": [
            *_APPLICATION,
            *_VALUATION,
            _v("scheduled_at", "Appointment", "Takimi", "Termin", "datetime", required=True),
            _v("date", "Date", "Data", "Datum", required=True),
            _v("time", "Time", "Ora", "Uhrzeit", required=True),
        ],
        "mustUse": ["date", "time"],
        "samples": {
            "default": {
                **_APPLICATION_SAMPLE,
                **_VALUATION_SAMPLE,
                "scheduled_at": "2026-10-02T10:30:00+02:00",
                "date": "02/10/2026",
                "time": "10:30",
            }
        },
    },
    {
        "key": "appointment_requirements",
        "label": _label("What to bring", "Çfarë të sillni", "Was mitzubringen ist"),
        "category": "appointment",
        "kind": "transactional",
        "variables": _APPLICATION,
        "samples": {"default": _APPLICATION_SAMPLE},
    },
    {
        "key": "appointment_reminder",
        "label": _label("Appointment reminder", "Kujtesë takimi", "Terminerinnerung"),
        "category": "appointment",
        "kind": "transactional",
        "variables": [
            *_APPLICATION,
            *_VALUATION,
            _v("scheduled_at", "Appointment", "Takimi", "Termin", "datetime", required=True),
            _v("time", "Time", "Ora", "Uhrzeit", required=True),
        ],
        "mustUse": ["time"],
        "samples": {
            "default": {
                **_APPLICATION_SAMPLE,
                **_VALUATION_SAMPLE,
                "scheduled_at": "2026-10-02T10:30:00+02:00",
                "time": "10:30",
            }
        },
    },
    {
        "key": "contact_received",
        "label": _label("Message received", "Mesazhi u mor", "Nachricht eingegangen"),
        "description": _label(
            "Sent the moment somebody writes from the contact form, with their message quoted.",
            "Dërgohet sapo dikush shkruan nga formulari i kontaktit, me mesazhin e tij.",
            "Sofort nach einer Nachricht über das Kontaktformular, mit der Nachricht zitiert.",
        ),
        "category": "support",
        "kind": "transactional",
        "variables": [
            _v("code", "Reference", "Referenca", "Referenz", required=True),
            *_PERSON,
            _v("title", "Subject", "Subjekti", "Betreff"),
            _v("description", "Their message", "Mesazhi i tyre", "Ihre Nachricht"),
            _v("submitted_at", "Submitted", "Dërguar më", "Eingereicht", "datetime"),
            _group(
                "site",
                "Site links",
                "Lidhjet e faqes",
                "Seitenlinks",
                [
                    _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
                    _v("valuation_url", "Valuation", "Vlerësimi", "Bewertung", "url"),
                    _v("blog_url", "Blog", "Blogu", "Blog", "url"),
                ],
            ),
        ],
        "mustUse": ["code"],
        #: Mirrors ``CONTACT_RECEIVED_SAMPLE`` in ``email-designs/contact-received.ts``.
        "samples": {
            "default": {
                "code": "CO-2026-00042",
                "first_name": "Arta",
                "full_name": "Arta Hoxha",
                "phone": "+355 69 123 4567",
                "title": "Makinë me kredi",
                "description": (
                    "Përshëndetje, a mund ta shes makinën nëse ende kam këste për të paguar "
                    "te banka?\nFaleminderit!"
                ),
                "submitted_at": "2026-10-02T19:35:00Z",
                "site": {
                    "contact_url": "https://marrimauto.com/contact",
                    "valuation_url": "https://marrimauto.com/valuation",
                    "blog_url": "https://marrimauto.com/blog",
                },
            }
        },
    },
    {
        "key": "job_application_received",
        "label": _label(
            "Job application received", "Aplikimi për punë u mor", "Bewerbung eingegangen"
        ),
        "description": _label(
            "Sent the moment somebody applies for an open position on the careers page.",
            "Dërgohet sapo dikush aplikon për një pozicion të hapur në faqen e karrierës.",
            "Sofort nach einer Bewerbung auf eine offene Stelle auf der Karriereseite.",
        ),
        "category": "careers",
        "kind": "transactional",
        "variables": [
            _v("code", "Reference", "Referenca", "Referenz", required=True),
            *_PERSON,
            _group(
                "position",
                "Position",
                "Pozicioni",
                "Stelle",
                [
                    _v("title", "Title", "Titulli", "Titel", required=True),
                    _v("department", "Department", "Departamenti", "Abteilung"),
                    _v("location", "Location", "Vendndodhja", "Standort"),
                    _v("employment_type", "Employment", "Orari", "Beschäftigung"),
                    _v("url", "Link", "Lidhja", "Link", "url"),
                ],
            ),
            _v("cv", "CV", "CV", "Lebenslauf"),
            _v("submitted_at", "Submitted", "Dërguar më", "Eingereicht", "datetime"),
            _group(
                "site",
                "Site links",
                "Lidhjet e faqes",
                "Seitenlinks",
                [
                    _v("careers_url", "Careers", "Karriera", "Karriere", "url"),
                    _v("about_url", "About us", "Rreth nesh", "Über uns", "url"),
                    _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
                ],
            ),
        ],
        "mustUse": ["code"],
        #: Mirrors ``JOB_APPLICATION_RECEIVED_SAMPLE`` in ``email-designs/job-application-received.ts``.
        "samples": {
            "default": {
                "code": "JA-2026-00042",
                "first_name": "Arta",
                "full_name": "Arta Hoxha",
                "phone": "+355 69 123 4567",
                "position": {
                    "title": "Vlerësues automjetesh",
                    "department": "Operacionet",
                    "location": "Tiranë",
                    "employment_type": "Kohë e plotë",
                    "url": "https://marrimauto.com/work-with-us/vleresues-automjetesh",
                },
                "cv": "Po, u bashkëngjit",
                "submitted_at": "2026-10-02T19:35:00Z",
                "site": {
                    "careers_url": "https://marrimauto.com/work-with-us",
                    "about_url": "https://marrimauto.com/about",
                    "contact_url": "https://marrimauto.com/contact",
                },
            }
        },
    },
    {
        "key": "partner_application_received",
        "label": _label(
            "Partner request received",
            "Kërkesa për partneritet u mor",
            "Partneranfrage eingegangen",
        ),
        "description": _label(
            "Sent the moment a workshop or a valuer offers to join the partner network.",
            "Dërgohet sapo një pikë kontrolli ose një vlerësues kërkon të bashkohet me rrjetin.",
            "Sofort, wenn eine Werkstatt oder ein Gutachter dem Partnernetz beitreten möchte.",
        ),
        "category": "careers",
        "kind": "transactional",
        "variables": [
            _v("code", "Reference", "Referenca", "Referenz", required=True),
            *_PERSON,
            _v("role", "Role", "Roli", "Rolle", required=True),
            _v("is_checkpoint", "Inspection point", "Pikë kontrolli", "Prüfstandort", "boolean"),
            _v("role_url", "Role page", "Faqja e rolit", "Rollenseite", "url"),
            _v("business_name", "Business", "Biznesi", "Unternehmen"),
            _v("identification_number", "Tax number", "NIPT", "Steuernummer"),
            _v("district", "District", "Rrethi", "Bezirk"),
            _v("address", "Address", "Adresa", "Adresse"),
            _v("experience", "Experience", "Përvoja", "Erfahrung"),
            _v("has_vehicle", "Own vehicle", "Mjet personal", "Eigenes Fahrzeug"),
            _v("submitted_at", "Submitted", "Dërguar më", "Eingereicht", "datetime"),
            _group(
                "site",
                "Site links",
                "Lidhjet e faqes",
                "Seitenlinks",
                [
                    _v("partners_url", "Work with us", "Puno me ne", "Mitarbeiten", "url"),
                    _v("contact_url", "Contact", "Kontakti", "Kontakt", "url"),
                ],
            ),
        ],
        "mustUse": ["code"],
        #: Mirrors ``PARTNER_APPLICATION_RECEIVED_SAMPLE`` in
        #: ``email-designs/partner-application-received.ts``.
        "samples": {
            "default": {
                "code": "PA-2026-00017",
                "first_name": "Arben",
                "full_name": "Arben Leka",
                "phone": "+355 68 222 3344",
                "role": "Pikë kontrolli",
                "is_checkpoint": True,
                "role_url": "https://marrimauto.com/work-with-us/partner/pike-kontrolli",
                "business_name": "Auto Servis Leka",
                "identification_number": "L12345678A",
                "district": "Durrës",
                "address": "Rruga Tregtare 45, Durrës",
                "experience": "—",
                "has_vehicle": "—",
                "submitted_at": "2026-10-02T19:35:00Z",
                "site": {
                    "partners_url": "https://marrimauto.com/work-with-us",
                    "contact_url": "https://marrimauto.com/contact",
                },
            },
            "valuer": {
                "code": "PA-2026-00018",
                "first_name": "Besa",
                "full_name": "Besa Kola",
                "phone": "+355 69 555 1212",
                "role": "Vlerësues i pavarur",
                "is_checkpoint": False,
                "role_url": "https://marrimauto.com/work-with-us/partner/vleresues-i-pavarur",
                "business_name": "",
                "identification_number": "",
                "district": "Tiranë",
                "address": "",
                "experience": "6 vite",
                "has_vehicle": "Po",
                "submitted_at": "2026-10-02T19:35:00Z",
                "site": {
                    "partners_url": "https://marrimauto.com/work-with-us",
                    "contact_url": "https://marrimauto.com/contact",
                },
            },
        },
    },
    {
        "key": "staff_notification",
        "label": _label("Staff notification", "Njoftim për stafin", "Mitarbeiter-Benachrichtigung"),
        "description": _label(
            "A notification by email, for staff who chose email for that kind on their "
            "preferences page.",
            "Një njoftim me email, për stafin që e zgjodhi emailin për atë lloj te "
            "preferencat e veta.",
            "Eine Benachrichtigung per E-Mail, für Mitarbeiter, die für diese Art E-Mail "
            "gewählt haben.",
        ),
        "category": "account",
        "kind": "transactional",
        "variables": [
            _group(
                "notification",
                "Notification",
                "Njoftimi",
                "Benachrichtigung",
                [
                    _v("title", "Title", "Titulli", "Titel", required=True),
                    _v("description", "Description", "Përshkrimi", "Beschreibung"),
                    _v("type", "Kind", "Lloji", "Art"),
                    _v("importance", "Importance", "Rëndësia", "Wichtigkeit"),
                    _v("url", "Link", "Lidhja", "Link", "url"),
                    _v("at", "When", "Kur", "Wann", "datetime"),
                ],
            ),
            _group(
                "site",
                "Panel links",
                "Lidhjet e panelit",
                "Panel-Links",
                [
                    _v("admin_url", "The panel", "Paneli", "Das Panel", "url"),
                    _v("preferences_url", "Preferences", "Preferencat", "Einstellungen", "url"),
                ],
            ),
        ],
        "mustUse": ["notification.title"],
        #: Mirrors ``STAFF_NOTIFICATION_SAMPLE`` in ``email-designs/staff-notification.ts``.
        "samples": {
            "default": {
                "notification": {
                    "title": "Aplikim i ri: APP-2026-00123",
                    "description": "AA123BB · web",
                    "type": "Aplikim",
                    "importance": "info",
                    "url": "https://cc.marrimauto.com/applications?view=sample",
                    "at": "2026-10-03T09:15:00Z",
                },
                "site": {
                    "admin_url": "https://cc.marrimauto.com",
                    "preferences_url": "https://cc.marrimauto.com/preferences",
                },
            }
        },
    },
    {
        "key": "payment_receipt",
        "label": _label("Payment receipt", "Dëftesa e pagesës", "Zahlungsbeleg"),
        "description": _label(
            "Sent when an application fee is paid.",
            "Dërgohet kur paguhet tarifa e aplikimit.",
            "Wird gesendet, wenn die Anfragegebühr bezahlt ist.",
        ),
        "category": "application",
        "kind": "transactional",
        "variables": [
            _v("payment_code", "Payment code", "Kodi i pagesës", "Zahlungscode", required=True),
            _v("code", "Application code", "Kodi i aplikimit", "Anfragecode"),
            _v("plate", "Plate", "Targa", "Kennzeichen"),
            _v("lane", "Lane", "Radha", "Spur"),
            _v("currency", "Currency", "Monedha", "Währung"),
            _v("list_price", "Price", "Çmimi", "Preis", "money"),
            _v("discount_amount", "Discount", "Zbritja", "Rabatt", "money"),
            _v("amount", "Paid", "Paguar", "Bezahlt", "money", required=True),
            _v("promotion", "Offer or coupon", "Oferta ose kuponi", "Angebot oder Gutschein"),
            _v("paid_at", "Paid on", "Paguar më", "Bezahlt am", "datetime"),
        ],
        "mustUse": ["payment_code", "amount"],
        "samples": {
            "default": {
                "payment_code": "PAY-7K2M9QLPXY",
                "code": "APP-XY7K2M9QLP",
                "plate": "AA123BB",
                "lane": "Radha e shpejtë",
                "currency": "EUR",
                "list_price": "30.00",
                "discount_amount": "6.00",
                "amount": "24.00",
                "promotion": "Viti i Ri",
                "paid_at": "2026-12-31T22:59:00Z",
            }
        },
    },
    {
        "key": "contact_response",
        "label": _label("Reply to a message", "Përgjigje mesazhi", "Antwort auf eine Nachricht"),
        "category": "support",
        "kind": "transactional",
        "variables": [
            _v("code", "Reference", "Referenca", "Referenz"),
            _v("full_name", "Name", "Emri", "Name"),
            _v("description", "Their message", "Mesazhi i tyre", "Ihre Nachricht"),
            _v("response", "Our reply", "Përgjigjja jonë", "Unsere Antwort", required=True),
        ],
        "mustUse": ["response"],
        "samples": {
            "default": {
                "code": "CNT-00042",
                "full_name": "Arta Hoxha",
                "description": "Can I sell a car that is still being paid off?",
                "response": "Yes — we settle the remaining loan with the bank directly.",
            }
        },
    },
    {
        "key": "verification_code",
        "label": _label("Verification code", "Kodi i verifikimit", "Bestätigungscode"),
        "description": _label(
            "A one-time code to confirm it is really the account's owner.",
            "Një kod njëpërdorimësh që konfirmon se jeni vërtet ju.",
            "Ein Einmalcode, der bestätigt, dass Sie es wirklich sind.",
        ),
        "category": "account",
        "kind": "transactional",
        "variables": [
            _v("code", "Code", "Kodi", "Code", required=True),
            _v("purpose", "Used for", "Përdoret për", "Verwendet für"),
            _v(
                "expires_minutes",
                "Valid (minutes)",
                "Vlen (minuta)",
                "Gültig (Minuten)",
                "number",
                required=True,
            ),
            _group(
                "request",
                "Request",
                "Kërkesa",
                "Anfrage",
                [
                    _v("at", "Requested at", "Kërkuar më", "Angefordert am", "datetime"),
                    _v("device", "Device", "Pajisja", "Gerät"),
                    _v("location", "Location", "Vendndodhja", "Standort"),
                ],
            ),
            _v("support_url", "Help link", "Lidhja e ndihmës", "Hilfe-Link", "url"),
        ],
        "mustUse": ["code"],
        #: Mirrors ``VERIFICATION_CODE_SAMPLE`` in ``email-designs/verification-code.ts``.
        "samples": {
            "default": {
                "code": "482917",
                "purpose": "hyrjen në llogarinë tuaj",
                "expires_minutes": 10,
                "request": {
                    "at": "2026-10-02T19:35:00Z",
                    "device": "Chrome në Windows",
                    "location": "Tiranë, Shqipëri",
                },
                "support_url": "https://marrimauto.com/contact",
            }
        },
    },
    {
        "key": "password_reset",
        "label": _label("Password reset", "Rivendosja e fjalëkalimit", "Passwort zurücksetzen"),
        "category": "account",
        "kind": "transactional",
        "variables": [
            _v("full_name", "Name", "Emri", "Name"),
            _v(
                "reset_url",
                "Reset link",
                "Lidhja e rivendosjes",
                "Link zum Zurücksetzen",
                "url",
                required=True,
            ),
            _v("link_days", "Link valid (days)", "Vlefshmëria (ditë)", "Gültig (Tage)", "number"),
        ],
        "mustUse": ["reset_url"],
        "samples": {
            "default": {
                "full_name": "Arta Hoxha",
                "reset_url": "https://admin.marrimauto.com/reset-password/sample",
                "link_days": 1,
            }
        },
    },
    {
        "key": "member_invitation",
        "label": _label("Team invitation", "Ftesë në ekip", "Team-Einladung"),
        "category": "account",
        "kind": "transactional",
        # Sent on creating a member AND on "Resend invitation": one design. The
        # sign-in details are the address and the panel — never a password,
        # which the member chooses through `invite_url`.
        "variables": [
            _v("full_name", "Name", "Emri", "Name"),
            _v("email", "Sign-in email", "Email-i i hyrjes", "Anmelde-E-Mail", "email"),
            _v(
                "invite_url",
                "Invitation link",
                "Lidhja e ftesës",
                "Einladungslink",
                "url",
                required=True,
            ),
            _v("login_url", "Sign-in page", "Faqja e hyrjes", "Anmeldeseite", "url"),
            _v("link_days", "Link valid (days)", "Vlefshmëria (ditë)", "Gültig (Tage)", "number"),
        ],
        "mustUse": ["invite_url"],
        "samples": {
            #: Mirrors ``MEMBER_INVITATION_SAMPLE`` in ``email-designs/member-invitation.ts``.
            "default": {
                "full_name": "Arta Hoxha",
                "email": "arta@marrimauto.com",
                "invite_url": "https://cc.marrimauto.com/accept-invitation/sample",
                "login_url": "https://cc.marrimauto.com/login",
                "link_days": 7,
            }
        },
    },
    {
        "key": "login_code",
        "label": _label("Sign-in code", "Kodi i hyrjes", "Anmeldecode"),
        "description": _label(
            "The second step of signing in, for members who chose an emailed code.",
            "Hapi i dytë i hyrjes, për anëtarët që zgjodhën kodin me email.",
            "Der zweite Anmeldeschritt für Mitglieder, die den Code per E-Mail gewählt haben.",
        ),
        "category": "account",
        "kind": "transactional",
        "variables": [
            _v("full_name", "Name", "Emri", "Name"),
            _v(
                "login_code",
                "Sign-in code",
                "Kodi i hyrjes",
                "Anmeldecode",
                required=True,
            ),
            _v("minutes", "Valid (minutes)", "Vlefshmëria (minuta)", "Gültig (Minuten)", "number"),
        ],
        "mustUse": ["login_code"],
        "samples": {"default": {"full_name": "Arta Hoxha", "login_code": "482913", "minutes": 10}},
    },
    {
        "key": "welcome",
        "label": _label("Welcome", "Mirëseardhje", "Willkommen"),
        "category": "account",
        "kind": "marketing",
        "variables": [_v("full_name", "Name", "Emri", "Name")],
        "samples": {"default": {"full_name": "Arta Hoxha"}},
    },
    {
        "key": "newsletter",
        "label": _label("Newsletter", "Buletini", "Newsletter"),
        "description": _label(
            "The monthly email to the mailing list — also sent once on signing up.",
            "Email-i mujor për listën — dërgohet edhe një herë pas abonimit.",
            "Die monatliche E-Mail an die Liste — auch einmal nach der Anmeldung.",
        ),
        "category": "marketing",
        "kind": "marketing",
        "variables": _NEWSLETTER,
        "samples": {
            "default": _NEWSLETTER_SAMPLE,
            "monthly": {
                **_NEWSLETTER_SAMPLE,
                "is_welcome": False,
                "market": {"valuations": 0, "average_offer": None, "top_brand": None},
                "articles_count": 0,
                "articles": [],
            },
        },
    },
    {
        "key": "announcement",
        "label": _label("Announcement", "Njoftim", "Ankündigung"),
        "category": "marketing",
        "kind": "marketing",
        "variables": [],
        "samples": {"default": {}},
    },
]

EMAIL_TYPE_KEYS = frozenset(spec["key"] for spec in EMAIL_TYPES)

#: The system variables every template may use (the same list as
#: ``SYSTEM_VARIABLES`` in ``@builderset/email``) with their sample values.
SYSTEM_SAMPLE: dict[str, Any] = {
    "recipient": {"name": "Arta Hoxha", "email": "arta@example.com"},
    "brand": {
        "name": "marrimauto.com",
        "website": "https://marrimauto.com",
        "address": "Rruga e Durrësit 12, Tiranë, Albania",
    },
    "links": {
        "unsubscribe": "https://marrimauto.com/email/unsubscribe/sample",
        "preferences": "https://marrimauto.com/email/preferences/sample",
        "view_in_browser": "https://marrimauto.com/email/view/sample",
    },
    "current_year": 2026,
}


def email_type(key: str) -> EmailTypeSpec | None:
    return next((spec for spec in EMAIL_TYPES if spec["key"] == key), None)


def _flatten(specs: list[VariableSpec], prefix: str = "") -> set[str]:
    paths: set[str] = set()
    for spec in specs:
        path = f"{prefix}.{spec['name']}" if prefix else spec["name"]
        children = spec.get("children")
        if children:
            paths |= _flatten(children, path)
            continue
        paths.add(path)
        for field in spec.get("fields") or []:
            paths.add(f"item.{field['name']}")
    return paths


_SYSTEM_PATHS = {
    "recipient.name",
    "recipient.email",
    "brand.name",
    "brand.website",
    "brand.address",
    "links.unsubscribe",
    "links.preferences",
    "links.view_in_browser",
    "current_year",
    "now",
}


def variable_paths(spec: EmailTypeSpec) -> set[str]:
    """Every path a template of this type may reference."""
    return _SYSTEM_PATHS | _flatten(spec.get("variables") or [])


__all__ = [
    "EMAIL_TYPES",
    "EMAIL_TYPE_KEYS",
    "SYSTEM_SAMPLE",
    "EmailTypeSpec",
    "VariableSpec",
    "email_type",
    "variable_paths",
]
