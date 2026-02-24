import { Controller, Post, Body, Param } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // Müşteriler (Giriş yapmadan) soru sorabilsin diye Public endpoint
  @Post(':userId')
  async chat(@Param('userId') userId: string, @Body() body: { message: string }) {
    return this.chatService.askAssistant(Number(userId), body.message);
  }
}