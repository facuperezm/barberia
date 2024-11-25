import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

interface AppointmentConfirmationEmailProps {
  customerName: string;
  date: string;
  time: string;
  service: string;
  barberName: string;
}

export default function AppointmentConfirmationEmail({
  customerName,
  date,
  time,
  service,
  barberName,
}: AppointmentConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Your appointment has been confirmed at Modern Barbershop
      </Preview>
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto px-4 py-8">
            <Section className="overflow-hidden rounded-lg bg-white shadow-lg">
              {/* Header */}
              <Section className="bg-gray-900 px-8 py-12">
                <Img
                  src="https://your-logo-url.com/logo.png"
                  width="64"
                  height="64"
                  alt="Modern Barbershop"
                  className="mx-auto mb-4"
                />
                <Heading className="mb-2 text-center text-2xl font-bold text-white">
                  Appointment Confirmed
                </Heading>
                <Text className="text-center text-gray-300">
                  We&apos;re looking forward to seeing you!
                </Text>
              </Section>

              {/* Appointment Details */}
              <Section className="px-8 py-12">
                <Text className="mb-6 text-lg text-gray-700">
                  Hi {customerName},
                </Text>
                <Text className="mb-6 text-gray-700">
                  Your appointment has been confirmed at Modern Barbershop. Here
                  are your booking details:
                </Text>

                <Section className="mb-6 rounded-lg bg-gray-50 p-6">
                  <Row>
                    <Column>
                      <Text className="mb-1 text-gray-600">Date</Text>
                      <Text className="font-medium">{date}</Text>
                    </Column>
                  </Row>
                  <Hr className="my-4 border-gray-200" />
                  <Row>
                    <Column>
                      <Text className="mb-1 text-gray-600">Time</Text>
                      <Text className="font-medium">{time}</Text>
                    </Column>
                  </Row>
                  <Hr className="my-4 border-gray-200" />
                  <Row>
                    <Column>
                      <Text className="mb-1 text-gray-600">Service</Text>
                      <Text className="font-medium">{service}</Text>
                    </Column>
                  </Row>
                  <Hr className="my-4 border-gray-200" />
                  <Row>
                    <Column>
                      <Text className="mb-1 text-gray-600">Barber</Text>
                      <Text className="font-medium">{barberName}</Text>
                    </Column>
                  </Row>
                </Section>

                <Section className="mb-8">
                  <Button
                    className="w-full rounded-md bg-gray-900 px-6 py-3 text-center font-medium text-white"
                    href={`${process.env.NEXT_PUBLIC_APP_URL}/appointments`}
                  >
                    View Appointment
                  </Button>
                </Section>

                <Section className="border-t border-gray-200 pt-6">
                  <Text className="mb-4 text-gray-700">
                    Need to make changes to your appointment?
                  </Text>
                  <Text className="mb-4 text-gray-700">
                    You can reschedule or cancel your appointment up to 2 hours
                    before the scheduled time. Please contact us at:
                  </Text>
                  <Text className="text-gray-700">
                    📞 <Link href="tel:+15551234567">+1 (555) 123-4567</Link>
                  </Text>
                  <Text className="text-gray-700">
                    ✉️{" "}
                    <Link href="mailto:contact@modernbarbershop.com">
                      contact@modernbarbershop.com
                    </Link>
                  </Text>
                </Section>
              </Section>

              {/* Footer */}
              <Section className="bg-gray-50 px-8 py-6 text-center">
                <Text className="text-sm text-gray-600">Modern Barbershop</Text>
                <Text className="text-sm text-gray-600">
                  123 Main Street, Downtown
                </Text>
                <Text className="text-sm text-gray-600">
                  Follow us on{" "}
                  <Link href="https://instagram.com/modernbarbershop">
                    Instagram
                  </Link>{" "}
                  and{" "}
                  <Link href="https://facebook.com/modernbarbershop">
                    Facebook
                  </Link>
                </Text>
              </Section>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
