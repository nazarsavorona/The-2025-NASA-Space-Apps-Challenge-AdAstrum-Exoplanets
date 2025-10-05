'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { storage } from '../../utils/storage';

export default function Results() {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        loadResults();
    }, []);

    const loadResults = async () => {
        try {
            const storedResults = await storage.getData('results', 'classification');
            if (!storedResults) {
                router.push('/');
                return;
            }
            setResults(storedResults);
            setLoading(false);
        } catch (error) {
            console.error('Error loading results:', error);
            router.push('/');
        }
    };

    const handleRowClick = async (planet) => {
        await storage.saveData('results', 'selectedPlanet', planet);
        router.push(`/planet/${planet.id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading results...</p>
                </div>
            </div>
        );
    }

    return (
        // <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 p-8">
        //     <div className="max-w-6xl mx-auto">
        //         <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">
        //             Classification Results
        //         </h1>

        //         <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        //             <table className="min-w-full">
        //                 <thead className="bg-indigo-500 text-white">
        //                     <tr>
        //                         <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
        //                             Planet Name
        //                         </th>
        //                         <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
        //                             Type
        //                         </th>
        //                         <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
        //                             Probability
        //                         </th>
        //                         <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
        //                             Distance
        //                         </th>
        //                     </tr>
        //                 </thead>
        //                 <tbody className="bg-white divide-y divide-gray-200">
        //                     {results.map((planet) => (
        //                         <tr
        //                             key={planet.id}
        //                             onClick={() => handleRowClick(planet)}
        //                             className="hover:bg-indigo-50 cursor-pointer transition-colors"
        //                         >
        //                             <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        //                                 {planet.name}
        //                             </td>
        //                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        //                                 {planet.type}
        //                             </td>
        //                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        //                                 <div className="flex items-center">
        //                                     <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
        //                                         <div
        //                                             className="bg-gradient-to-r from-green-400 to-blue-500 h-2.5 rounded-full"
        //                                             style={{ width: `${planet.probability * 100}%` }}
        //                                         ></div>
        //                                     </div>
        //                                     <span>{(planet.probability * 100).toFixed(0)}%</span>
        //                                 </div>
        //                             </td>
        //                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
        //                                 {planet.distance}
        //                             </td>
        //                         </tr>
        //                     ))}
        //                 </tbody>
        //             </table>
        //         </div>

        //         <div className="mt-8 flex justify-center">
        //             <button
        //                 onClick={async () => {
        //                     await storage.clearStore('results');
        //                     router.push('/');
        //                 }}
        //                 className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        //             >
        //                 Start New Classification
        //             </button>
        //         </div>
        //     </div>
        // </div>

        <h1>Results</h1>
    )
};