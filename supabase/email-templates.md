# Supabase Email Templates

These are starter templates for the Supabase Auth email configuration and RSVP confirmation messaging. Update the copy in Supabase when you are ready.

## Magic link email

**Subject:** Your wedding details access link

**Body:**

Hi {{first_name}},

Here’s your secure link to access the wedding website and your RSVP details:
{{magic_link}}

If you didn’t request this link, you can ignore this email.

With love,
Edward & Laura

## RSVP confirmation email

### Attending = yes

**Subject:** Your RSVP has been received

**Body:**

Hi {{first_name}},

Thank you for your RSVP — we can’t wait to celebrate with you!

If you need to change any details, you can use the magic link anytime:
{{magic_link}}

With love,
Edward & Laura

### Attending = no

**Subject:** Your RSVP has been received

**Body:**

Hi {{first_name}},

Thank you for letting us know. We’re sure we’ll see you soon.

If you need to update anything, you can use this link:
{{magic_link}}

With love,
Edward & Laura
