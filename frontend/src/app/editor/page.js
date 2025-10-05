'use client';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Papa from 'papaparse';
import { useEffect, useState } from 'react';
import ClassifyModal from '../../components/ClassifyModal';
import { storage } from '../../utils/storage';
import bgImage from './data_editor_bg.png';

export default function Editor() {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [fileName, setFileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRows, setTotalRows] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const rowsPerPage = 50;
    const router = useRouter();

    useEffect(() => {
        loadCSVData();
    }, []);

    const loadCSVData = async () => {
        try {
            setLoading(true);

            const metadata = await storage.getData('csvData', 'metadata');
            if (!metadata) {
                router.push('/');
                return;
            }

            setFileName(metadata.fileName);
            let csvContent = '';
            for (let i = 0; i < metadata.chunksCount; i++) {
                const chunk = await storage.getData('csvData', `chunk_${i}`);
                csvContent += chunk;
            }

            const lines = csvContent.split('\n');
            const cleanedLines = lines.filter(line => {
                const trimmedLine = line.trim();
                return trimmedLine && !trimmedLine.startsWith('#');
            });
            const cleanedCsv = cleanedLines.join('\n');

            Papa.parse(cleanedCsv, {
                header: true,
                dynamicTyping: true,
                complete: (result) => {
                    const filteredData = result.data.filter(row =>
                        Object.values(row).some(value =>
                            (typeof value === 'string' && value.trim() !== '') ||
                            typeof value === 'number' ||
                            typeof value === 'boolean'
                        )
                    );
                    setData(filteredData);
                    setTotalRows(filteredData.length);
                    if (filteredData.length > 0) setColumns(Object.keys(filteredData[0]));
                    setLoading(false);
                },
                error: (err) => {
                    console.error('Parse error:', err);
                    alert('Error parsing CSV file');
                    setLoading(false);
                },
            });
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Error loading data');
            router.push('/');
        }
    };

    const handleCellEdit = (rowIndex, columnName, value) => {
        const newData = [...data];
        newData[rowIndex][columnName] = value;
        setData(newData);
    };

    const handleDeleteColumn = (columnName) => {
        const updatedColumns = columns.filter((c) => c !== columnName);
        const updatedData = data.map((row) => {
            const { [columnName]: _omit, ...rest } = row;
            return rest;
        });
        setColumns(updatedColumns);
        setData(updatedData);
    };

    const handleSubmit = async () => {
        setShowModal(true);
        try {
            await storage.saveData('processedData', 'data', data);
            await storage.saveData('processedData', 'columns', columns);
            const originalFile = await storage.getData('csvData', 'originalFile');
            if (!originalFile) {
                alert('Original file not found.');
                setLoading(false);
                return;
            }

            const formData = new FormData();
            formData.append('file', originalFile);

            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include',
            });

            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            await storage.clearStore('csvData');
            setLoading(false);
            setShowModal(true);
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Error uploading file: ' + error.message);
            setLoading(false);
        }
    };

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const currentData = data.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalRows / rowsPerPage);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundImage: `url(${bgImage.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto"></div>
                    <p className="mt-4 text-violet-300 text-sm tracking-wide">Loading CSV data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen text-gray-100 p-8 font-mono relative" style={{ backgroundImage: `url(${bgImage.src})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
            <button className="text-violet-400 hover:text-violet-200 mb-8 text-sm transition cursor-pointer">&lt; Back</button>

            <div className="max-w-full mx-auto">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-light tracking-widest text-white drop-shadow-md mb-1">
                            EXOPLANET DATA EDITOR
                        </h1>
                        <p className="text-violet-400 text-xs tracking-wide">
                            File: {fileName} | Total rows: {totalRows} | Total columns: {columns.length}
                        </p>

                        <div className="mt-6 flex justify-between items-center text-sm text-violet-300">
                            <span>
                                Showing {startIndex + 1}-{Math.min(endIndex, totalRows)} of {totalRows}
                            </span>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-1 rounded border border-violet-600 text-violet-300 hover:bg-violet-600/20 disabled:opacity-40"
                                >
                                    ← Prev
                                </button>
                                <span className="px-3 py-1 bg-violet-950/50 rounded">
                                    Page {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-4 py-1 rounded border border-violet-600 text-violet-300 hover:bg-violet-600/20 disabled:opacity-40"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </div>


                    <button
                        onClick={handleSubmit}
                        className="border cursor-pointer border-white-500 hover:bg-violet-600/20 text-white-300 hover:text-white transition-all px-8 py-2 rounded-md shadow-md"
                    >
                        Continue
                    </button>



                </div>

                <div className="from-gray-900/60 to-gray-950/60 border border-violet-800/40 shadow-2xl">


                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead className="sticky top-0 z-10">
                                <tr className="border-b border-violet-900/60">
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-violet-300 uppercase tracking-wider border-r border-violet-800/40 bg-violet-950/60">
                                        #
                                    </th>
                                    {columns.map((col, idx) => (
                                        <th
                                            key={idx}
                                            className="px-3 py-3 text-left text-xs font-semibold text-violet-200 uppercase tracking-wider border-r border-violet-900/40 min-w-[150px]"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1">
                                                    <span>{col}</span>
                                                    <button
                                                        onClick={() => handleDeleteColumn(col)}
                                                        title="Delete column"
                                                        className="p-0.5 text-violet-400 hover:text-red-400 transition"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                    <div className="flex flex-col text-violet-400">
                                                        <ChevronUp className="w-3 h-3 -mb-1" />
                                                        <ChevronDown className="w-3 h-3" />
                                                    </div>
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Search"
                                                    className="w-full bg-transparent border border-white-800 px-2 py-1 text-xs text-white placeholder-white-500 focus:outline-none focus:border-violet-400 rounded"
                                                />
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-violet-900/50">
                                {currentData.map((row, rowIdx) => (
                                    <tr
                                        key={startIndex + rowIdx}
                                        className="hover:bg-violet-900/20 transition"
                                    >
                                        <td className="px-3 py-2 text-sm text-white-400 border-r border-violet-900/40 bg-violet-950/40 font-medium">
                                            {startIndex + rowIdx + 1}
                                        </td>
                                        {columns.map((col, colIdx) => (
                                            <td
                                                key={colIdx}
                                                className="px-3 py-2 text-sm text-white-100 border-r border-violet-900/40 min-w-[150px]"
                                            >
                                                <input
                                                    type="text"
                                                    value={row[col] || ''}
                                                    onChange={(e) =>
                                                        handleCellEdit(startIndex + rowIdx, col, e.target.value)
                                                    }
                                                    className="w-full px-2 py-1 border-0 bg-transparent text-violet-100 focus:outline-none focus:bg-violet-950/50 focus:border focus:border-violet-700 rounded transition"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

            {showModal && <ClassifyModal onClose={() => setShowModal(false)} />}
        </div>
    );
}
