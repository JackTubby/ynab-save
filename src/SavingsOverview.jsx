import { useState, useEffect } from 'react'
import * as ynab from 'ynab'

const accessToken = import.meta.env.VITE_YNAB_API_KEY
const ynabAPI = new ynab.API(accessToken)

function SavingsOverview() {
  const [savingsData, setSavingsData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchSavingsData() {
      try {
        setLoading(true)

        // Get the first budget
        const budgetsResponse = await ynabAPI.budgets.getBudgets()
        const budget = budgetsResponse.data.budgets[0]
        const budgetId = budget.id

        // Fetch savings accounts
        const accountsResponse = await ynabAPI.accounts.getAccounts(budgetId)
        const savingsAccounts = accountsResponse.data.accounts.filter(
          (account) =>
            account.on_budget === true &&
            account.closed === false &&
            (account.type === 'Savings' ||
              account.name.toLowerCase().includes('savings') ||
              account.name.toLowerCase().includes('isa'))
        )
        console.log('accounts', savingsAccounts)

        // Fetch savings categories - get all categories from the "savings" category group
        const categoriesResponse = await ynabAPI.categories.getCategories(budgetId)
        const savingsCategories = categoriesResponse.data.category_groups
          .filter((group) => group.name.toLowerCase().includes('savings'))
          .flatMap((group) => group.categories)

        setSavingsData({
          budget: budget.name,
          savingsAccounts,
          savingsCategories,
        })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchSavingsData()
  }, [])

  // Helper function to convert milliunits to dollars
  const milliunitsToPounds = (milliunits) => {
    return (milliunits / 1000).toFixed(2)
  }

  if (loading) return <div>Loading savings data...</div>
  if (error) return <div>Error: {error}</div>
  if (!savingsData) return <div>No data available</div>

  return (
    <div>
      <h2>Savings Overview - {savingsData.budget}</h2>

      <h3>Savings Accounts</h3>
      {savingsData.savingsAccounts.map((account) => (
        <div key={account.id}>
          {account.name}: £{milliunitsToPounds(account.balance)}
        </div>
      ))}

      <h3>Savings Categories</h3>
      {savingsData.savingsCategories.map((category) => (
        <div key={category.id}>
          {category.name}: £{milliunitsToPounds(category.balance)}
        </div>
      ))}
    </div>
  )
}

export default SavingsOverview
