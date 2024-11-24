import React, { useEffect, useState } from 'react';
import axios from 'axios';

function App() {
    const [transactions, setTransactions] = useState([]);
    const [month, setMonth] = useState('March');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);

    // Fetch transactions based on current state values
    useEffect(() => {
        const fetchTransactions = async () => {
            setLoading(true); // Show loading indicator
            try {
                const { data } = await axios.get(
                    `/api/transactions?month=${month}&search=${search}&page=${page}&perPage=10`
                );
                setTransactions(data.transactions);
                setTotalPages(data.totalPages || 1);
            } catch (error) {
                console.error('Error fetching transactions:', error);
            } finally {
                setLoading(false); // Hide loading indicator
            }
        };

        fetchTransactions();
    }, [month, search, page]); // Add dependencies to re-fetch when they change

    return (
        <div>
            <h1>Transactions</h1>

            {/* Month Selector */}
            <select value={month} onChange={(e) => setMonth(e.target.value)}>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
                    .map((m) => <option key={m} value={m}>{m}</option>)}
            </select>

            {/* Search Bar */}
            <input
                type="text"
                placeholder="Search transactions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />

            {/* Transactions Table */}
            {loading ? (
                <p>Loading...</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Description</th>
                            <th>Price</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length > 0 ? (
                            transactions.map((t, index) => (
                                <tr key={index}>
                                    <td>{t.title}</td>
                                    <td>{t.description}</td>
                                    <td>{t.price}</td>
                                    <td>{new Date(t.dateOfSale).toLocaleDateString()}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4">No transactions found</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}

            {/* Pagination Controls */}
            <div>
                <button
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1 || loading}
                >
                    Previous
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages || loading}
                >
                    Next
                </button>
            </div>
        </div>
    );
}

export default App;
