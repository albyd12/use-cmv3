import React, { useState, useEffect, useCallback } from 'react'

interface ClockProps {
  startDate: Date
}

const Clock: React.FC<ClockProps> = ({ startDate }) => {
  const calculateTimeLeft = useCallback((): { days: number; hours: number; minutes: number; seconds: number } => {
    const difference = Math.max(startDate.getTime() - new Date().getTime(), 0)
    const timeLeft = {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    }
    return timeLeft
  }, [startDate])
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft())

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft())
    }, 1000)

    return () => clearTimeout(timer)
  }, [startDate, calculateTimeLeft])

  const formatTimeUnit = (unit: number): string => {
    return unit < 10 ? `0${unit}` : `${unit}`
  }

  return (
    <div>
      <div>
        <span>{formatTimeUnit(timeLeft.days)}</span> days <span>{formatTimeUnit(timeLeft.hours)}</span> hours{' '}
        <span>{formatTimeUnit(timeLeft.minutes)}</span> minutes <span>{formatTimeUnit(timeLeft.seconds)}</span> seconds
      </div>
    </div>
  )
}

export default Clock
