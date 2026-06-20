import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { GetAssetContentUseCase } from '../../application/use-cases/get-asset-content.use-case';
import { mapAssetErrors } from './asset-error.mapper';

@Controller('assets')
export class AssetController {
  constructor(private readonly getAssetContent: GetAssetContentUseCase) {}

  @Get(':id')
  async getAsset(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    return mapAssetErrors(async () => {
      const { content, contentType } = await this.getAssetContent.execute(id);

      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      });

      return new StreamableFile(content);
    });
  }
}
