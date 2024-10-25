import { LandingPage } from "@/components/app-components-landing-page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Clock,
  Facebook,
  Instagram,
  MapPin,
  Phone,
  Scissors,
} from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b">
      <header className="bg-black shadow-md">
        <div className="container mx-auto flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-2">
            <Scissors className="size-4 rotate-90 text-white" />
            <span className="text-xs font-bold text-gray-500">
              lunes a viernes de 12 a 20
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <a href="#" className="text-gray-500 hover:text-gray-800">
              <Instagram className="size-4" />
            </a>
            <a href="#" className="text-gray-500 hover:text-gray-800">
              <Facebook className="size-4" />
            </a>
          </div>
        </div>
      </header>
      <main>
        <section className="relative flex h-[60vh] items-center justify-center">
          <div className="absolute inset-0 bg-black/50">
            <Image
              src="https://joseppons.com/formacion/wp-content/uploads/2020/11/servicios-salon-barberia.jpeg"
              alt="Barberia"
              layout="fill"
              objectFit="cover"
              className="brightness-50 contrast-125 grayscale hue-rotate-180"
            />
          </div>
          <div className="relative z-10 text-center">
            <div className="mb-4 flex items-center justify-center space-x-1">
              <Scissors className="size-10 rotate-90 text-white" />
              <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight text-white lg:text-5xl">
                Barberia
              </h1>
            </div>
            <p className="mb-8 text-lg leading-tight text-white">
              Expresa tu estilo con un corte de pelo profesional
            </p>
            <Button size="lg" variant="secondary">
              SACAR TURNO
            </Button>
          </div>
        </section>
        {/* About Section */}
        <section id="about" className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">
              Sobre nosotros
            </h2>
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <p className="mb-4 text-gray-600">
                  Soy un barbero con más de 10 años de experiencia.
                </p>
                <p className="text-gray-600">
                  Con más de 10 años de experiencia, he servido a mi comunidad
                  con orgullo y dedicación. Ven a visitarnos y experimenta la
                  diferencia de Barberia.
                </p>
              </div>
              <div className="relative h-64 drop-shadow-xl">
                <Image
                  src="https://joseppons.com/formacion/wp-content/uploads/2020/11/servicios-salon-barberia.jpeg"
                  alt="Barbershop Tools"
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">
              Nuestros Servicios
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  name: "Corte Clásico",
                  price: "$25",
                  image:
                    "https://e00-expansion.uecdn.es/assets/multimedia/imagenes/2022/05/19/16529551622743.jpg",
                },
                {
                  name: "Afeitado de Barba",
                  price: "$15",
                  image:
                    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRqkrRM38jh3HglPhvkZ1P_CQx0N6Ar3V3upw&s",
                },
                {
                  name: "Afeitado con Toalla Caliente",
                  price: "$30",
                  image:
                    "https://www.elivelimen.com/blog/wp-content/uploads/2020/03/muselines-eliveli-men-peluqueria-barberia-donostia-060-1024x683.jpg",
                },
              ].map((service, index) => (
                <Card key={index}>
                  <CardContent className="p-0">
                    <div className="relative h-48 w-full overflow-hidden rounded-lg">
                      <Image
                        src={service.image}
                        alt={service.name}
                        layout="fill"
                        objectFit="cover"
                        className="h-48 w-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="mb-2 text-xl font-semibold">
                        {service.name}
                      </h3>
                      <p className="text-gray-600">{service.price}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="bg-white py-16">
          <div className="container mx-auto px-4">
            <h2 className="mb-8 text-center text-3xl font-bold">Contactanos</h2>
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div className="flex flex-col justify-center space-y-4">
                <div className="flex items-center">
                  <MapPin className="mr-2 text-gray-600" />
                  <span>Güemes 4552, Cdad. Autónoma de Buenos Aires</span>
                </div>
                <div className="flex items-center">
                  <Phone className="mr-2 text-gray-600" />
                  <span>+54 9 11 3456-7890</span>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 text-gray-600" />
                  <span>Lunes a viernes de 12 a 20, domingo cerrado</span>
                </div>
                <div className="mt-6 flex space-x-4"></div>
              </div>
              <div className="h-64 md:h-auto">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3284.8763136085818!2d-58.42618038791922!3d-34.58199607284923!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x95bcb58486dabbbf%3A0x298a0565be304bec!2sG%C3%BCemes%204552%2C%20C1425%20Cdad.%20Aut%C3%B3noma%20de%20Buenos%20Aires%2C%20Argentina!5e0!3m2!1sen!2sus!4v1729877988106!5m2!1sen!2sus"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-800 py-8 text-white">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2024 StyleCut Barbershop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
