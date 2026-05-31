import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LandingPageService } from '@/modules/landing/services/landing-page.service';
import { EmailTrackingService } from '@/modules/email/services/email-tracking.service';

@Controller('p')
export class PublicLandingController {
  constructor(
    private readonly pages: LandingPageService,
    private readonly tracking: EmailTrackingService,
  ) {}

  // GET /p/:slug/:trackingId — renders the landing page HTML with the form
  // action rewritten to POST back to /p/:slug/:trackingId/submit so we can
  // capture submission events.
  @Get(':slug/:trackingId')
  async render(
    @Param('slug') slug: string,
    @Param('trackingId') trackingId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const page = await this.pages.findBySlug(slug);

    await this.tracking.trackLandingView(trackingId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Inject the submit endpoint into every <form> on the page so whatever
    // markup the admin authored, we own the submission target.
    const submitUrl = `/p/${slug}/${trackingId}/submit`;
    const withForm = page.htmlContent.replace(
      /<form\b([^>]*)>/gi,
      (_match, attrs) =>
        `<form${stripExisting(attrs, ['action', 'method'])} method="POST" action="${submitUrl}">`,
    );

    res.type('text/html').send(withForm);
  }

  @Post(':slug/:trackingId/submit')
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('slug') slug: string,
    @Param('trackingId') trackingId: string,
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const page = await this.pages.findBySlug(slug).catch(() => null);
    if (!page) throw new NotFoundException();

    await this.tracking.trackSubmission(trackingId, body as Record<string, any>, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Either send the target to the configured awareness URL, or to a
    // built-in "Gotcha — this was a phish" page.
    if (page.redirectUrl) {
      return res.redirect(page.redirectUrl);
    }
    return res.type('text/html').send(awarenessHtml());
  }
}

function stripExisting(attrs: string, names: string[]): string {
  let out = attrs;
  for (const n of names) {
    out = out.replace(new RegExp(`\\s+${n}=("|')[^"']*\\1`, 'gi'), '');
  }
  return out;
}

function awarenessHtml(): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Phishing simulation</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; background: #0b0b0c; color: #ededed; margin: 0; padding: 0; min-height: 100vh; display:flex; align-items:center; justify-content:center; }
  .card { background: #141416; border: 1px solid #2a2a2e; padding: 32px 28px; max-width: 480px; border-radius: 8px; }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #ffb347; }
  p { margin: 0 0 10px; color: #b6b6bb; }
  ul { margin: 12px 0 0; padding-left: 20px; color: #b6b6bb; }
  li { margin-bottom: 4px; }
</style></head><body>
<div class="card">
  <h1>That was a phishing simulation</h1>
  <p>The page you just submitted credentials to was a controlled exercise from your security team. As a precaution, change any password you may have just entered.</p>
  <p><strong>Red flags to spot next time:</strong></p>
  <ul>
    <li>Urgent or threatening language</li>
    <li>Unexpected sender or domain</li>
    <li>Login forms reached through an email link</li>
    <li>Mismatched URL on hover</li>
  </ul>
</div>
</body></html>`;
}
