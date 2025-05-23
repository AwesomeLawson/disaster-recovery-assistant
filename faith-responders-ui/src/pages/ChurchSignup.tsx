import { useState } from 'react';

export default function ChurchSignup() {
  const [formData, setFormData] = useState({
    churchName: '',
    contactName: '',
    email: '',
    phone: '',
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
        <h2 className="text-2xl font-bold text-blue-700 mb-6 text-center">Church Signup</h2>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Church Name</label>
            <input
              type="text"
              name="churchName"
              value={formData.churchName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Contact Name</label>
            <input
              type="text"
              name="contactName"
              value={formData.contactName}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-blue-200"
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
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full border border-gray-300 p-2 rounded shadow-sm focus:ring focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded hover:bg-blue-700"
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}