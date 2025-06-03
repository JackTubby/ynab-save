import { useState, useEffect } from 'react'
import { Card, Text, Group, Stack, Progress, Badge, Grid, Paper, Title, Alert } from '@mantine/core'
import { IconAlertCircle, IconTargetArrow, IconCalendar } from '@tabler/icons-react'
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

  // Helper function to convert milliunits to pounds
  const milliunitsToPounds = (milliunits) => {
    return (milliunits / 1000).toFixed(2)
  }

  if (loading) return <div>Loading savings data...</div>
  if (error) return <div>Error: {error}</div>
  if (!savingsData) return <div>No data available</div>

  const totalAccountsBalance = savingsData.savingsAccounts.reduce((sum, account) => sum + account.balance, 0)
  const totalCategoriesBalance = savingsData.savingsCategories.reduce((sum, category) => sum + category.balance, 0)
  const balancesMatch = Math.abs(totalAccountsBalance - totalCategoriesBalance) < 1000 // Within £1

  return (
    <Stack spacing="xl" p="md">
      <Title order={1}>Savings Overview - {savingsData.budget}</Title>

      {/* Totals comparison */}
      <Paper p="md" withBorder>
        <Group position="apart" mb="sm">
          <Text size="lg" weight={600}>
            Savings Summary
          </Text>
        </Group>
        <Group spacing="xl">
          <div>
            <Text size="sm" color="dimmed">
              Total in Accounts
            </Text>
            <Text size="xl" weight={700}>
              £{milliunitsToPounds(totalAccountsBalance)}
            </Text>
          </div>
          <div>
            <Text size="sm" color="dimmed">
              Total in Categories
            </Text>
            <Text size="xl" weight={700}>
              £{milliunitsToPounds(totalCategoriesBalance)}
            </Text>
          </div>
        </Group>
        {!balancesMatch && (
          <Alert icon={<IconAlertCircle size={16} />} color="orange" mt="sm">
            Account and category totals don't match. Difference: £
            {milliunitsToPounds(Math.abs(totalAccountsBalance - totalCategoriesBalance))}
          </Alert>
        )}
      </Paper>

      {/* Savings Accounts */}
      <div>
        <Title order={2} mb="md">
          Savings Accounts
        </Title>
        <Grid>
          {savingsData.savingsAccounts.map((account) => (
            <Grid.Col key={account.id} span={6}>
              <Card shadow="sm" p="lg" radius="md" withBorder>
                <Group position="apart" mb="xs">
                  <Text weight={500}>{account.name}</Text>
                  <Badge color="green" variant="light">
                    {account.type}
                  </Badge>
                </Group>
                <Text size="xl" weight={700} color="green">
                  £{milliunitsToPounds(account.balance)}
                </Text>
              </Card>
            </Grid.Col>
          ))}
        </Grid>
      </div>

      {/* Savings Categories */}
      <div>
        <Title order={2} mb="md">
          Savings Categories
        </Title>
        <Grid>
          {savingsData.savingsCategories.map((category) => {
            const progressPercentage = category.goal_percentage_complete || 0
            const isCompleted = progressPercentage >= 100
            const hasGoal = category.goal_target > 0

            return (
              <Grid.Col key={category.id} span={4}>
                <Card shadow="sm" p="lg" radius="md" withBorder h="100%">
                  <Stack spacing="sm">
                    <Group position="apart">
                      <Text weight={500} size="sm">
                        {category.name}
                      </Text>
                      {isCompleted && (
                        <Badge color="green" size="sm">
                          Complete!
                        </Badge>
                      )}
                      {category.goal_type && (
                        <Badge color={category.goal_type === 'NEED' ? 'blue' : 'purple'} variant="light" size="xs">
                          {category.goal_type === 'NEED' ? 'Target' : 'Build'}
                        </Badge>
                      )}
                    </Group>

                    <Text size="lg" weight={700}>
                      £{milliunitsToPounds(category.balance)}
                    </Text>

                    {hasGoal && (
                      <>
                        <div>
                          <Group position="apart" mb={5}>
                            <Text size="xs" color="dimmed">
                              Progress to goal
                            </Text>
                            <Text size="xs" color="dimmed">
                              {progressPercentage}%
                            </Text>
                          </Group>
                          <Progress value={progressPercentage} color={isCompleted ? 'green' : 'blue'} size="sm" />
                        </div>

                        <Group position="apart">
                          <div>
                            <Text size="xs" color="dimmed">
                              Target
                            </Text>
                            <Text size="sm" weight={500}>
                              £{milliunitsToPounds(category.goal_target)}
                            </Text>
                          </div>
                          {category.goal_target_month && (
                            <div>
                              <Text size="xs" color="dimmed">
                                Target Date
                              </Text>
                              <Text size="sm">
                                {new Date(category.goal_target_month + '-01').toLocaleDateString('en-GB', {
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </Text>
                            </div>
                          )}
                        </Group>

                        {!isCompleted && category.goal_overall_left > 0 && (
                          <Text size="xs" color="dimmed">
                            £{milliunitsToPounds(category.goal_overall_left)} remaining
                          </Text>
                        )}
                      </>
                    )}

                    {category.note && (
                      <Text size="xs" color="dimmed" italic>
                        {category.note}
                      </Text>
                    )}
                  </Stack>
                </Card>
              </Grid.Col>
            )
          })}
        </Grid>
      </div>
    </Stack>
  )
}

export default SavingsOverview
