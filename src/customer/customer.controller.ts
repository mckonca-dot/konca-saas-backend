import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards, 
  Req // 👈 Eksik olan 'Req' buraya eklendi
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.customerService.create(req.user.userId, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get()
  findAll(@Req() req: any) {
    return this.customerService.findAll(req.user.userId);
  }

  // Müşteri Notu Güncelleme
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/note')
  async updateNote(@Param('id') id: string, @Body() body: { note: string }) {
    return this.customerService.updateNote(Number(id), body.note);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.customerService.remove(Number(id));
  }
}