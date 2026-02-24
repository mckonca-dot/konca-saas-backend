// backend/src/appointments/dto/create-appointment.dto.ts

export class CreateAppointmentDto {
  customerId: number;
  serviceId: number;
  dateTime: string;
}