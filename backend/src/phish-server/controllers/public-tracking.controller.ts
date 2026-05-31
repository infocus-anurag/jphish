import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Header,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { EmailTrackingService } from '@/modules/email/services/email-tracking.service';

@Controller('t')
export class PublicTrackingController {
  constructor(private readonly tracking: EmailTrackingService) {}

  // 1×1 GIF (43 bytes, transparent).
  private static readonly PIXEL = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64',
  );

  @Get('o/:trackingId')
  @Header('Cache-Control', 'no-store, must-revalidate')
  @Header('Pragma', 'no-cache')
  async open(
    @Param('trackingId') trackingId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.tracking.trackOpen(trackingId, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    res.type('image/gif').send(PublicTrackingController.PIXEL);
  }

  @Get('c/:trackingId')
  async click(
    @Param('trackingId') trackingId: string,
    @Query('u') encodedUrl: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    let target = '/';
    if (encodedUrl) {
      try {
        target = Buffer.from(encodedUrl, 'base64url').toString('utf-8');
      } catch {
        target = '/';
      }
    }
    await this.tracking.trackClick(trackingId, target, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
    });
    res.redirect(target);
  }

  @Get('r/:trackingId')
  async reportGet(
    @Param('trackingId') trackingId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.tracking.trackReport(trackingId, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
      via: 'GET',
    });
    res
      .type('text/html')
      .send(reportConfirmationHtml());
  }

  // RFC 8058 one-click report from Gmail/Outlook hits POST.
  @Post('r/:trackingId')
  @HttpCode(HttpStatus.OK)
  async reportPost(
    @Param('trackingId') trackingId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    await this.tracking.trackReport(trackingId, {
      userAgent: req.get('user-agent'),
      ip: req.ip,
      via: 'POST-oneclick',
      body,
    });
    return { reported: true };
  }
}

function reportConfirmationHtml(): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Reported — Thank you</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; background: #0b0b0c; color: #ededed; margin: 0; padding: 0; min-height: 100vh; display:flex; align-items:center; justify-content:center; }
  .card { background: #141416; border: 1px solid #2a2a2e; padding: 32px 28px; max-width: 440px; border-radius: 8px; }
  h1 { margin: 0 0 8px; font-size: 20px; font-weight: 600; }
  p { margin: 0; color: #b6b6bb; }
  .ok { color: #65d18a; }
</style></head><body>
<div class="card">
  <h1 class="ok">Thank you for reporting</h1>
  <p>This was a simulated phishing exercise. Reporting suspected phish is the right action — well done.</p>
</div>
</body></html>`;
}
