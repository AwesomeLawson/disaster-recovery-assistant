import { useState } from 'react';

export default function IndividualSignup() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    church: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitted:', formData);
    // Later: Send to Azure Function
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-8">
        <h2 className="text-2xl font-bold text-green-700 mb-6 text-center">Volunteer Signup</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-1">First Name</label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-green-200"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Last Name</label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-green-200"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-green-200"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-green-200"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Church (optional)</label>
            <input
              type="text"
              name="church"
              value={formData.church}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-green-200"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-green-600 text-white font-medium py-2 px-4 rounded hover:bg-green-700"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}