import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ReviewService } from './review.service';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // Yorum Ekle
  @Post()
  async create(@Body() body: any) {
    return this.reviewService.addReview({
      shopId: Number(body.shopId),
      rating: Number(body.rating),
      comment: body.comment,
      customerName: body.customerName,
    });
  }

  // Yorumları Getir
  @Get(':shopId')
  async getAll(@Param('shopId') shopId: string) {
    return this.reviewService.getShopReviews(Number(shopId));
  }
}