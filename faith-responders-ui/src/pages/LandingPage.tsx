import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <section className="w-full bg-blue-50 px-8 py-16">
      <div className="max-w-screen-xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-blue-800 mb-6">
          Serving Communities Through Faith & Action
        </h2>

        <p className="text-lg md:text-xl text-gray-700 mb-10 max-w-4xl">
          Faith Responders partners with local churches and individuals to bring hands-on help to disaster-affected communities across the country.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/church-signup"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md text-lg shadow text-center w-full sm:w-auto"
          >
            I'm a Church
          </Link>
          <Link
            to="/individual-signup"
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md text-lg shadow text-center w-full sm:w-auto"
          >
            I'm an Individual
          </Link>
        </div>
      </div>
    </section>
  );
}
