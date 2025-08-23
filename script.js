class WeatherDashboard {
  constructor() {
    this.API_KEY = "18375d0d612300dd87752a4dba7a2175"
    this.BASE_URL = "https://api.openweathermap.org/data/2.5"
    this.savedCities = JSON.parse(localStorage.getItem("savedCities") || "[]")
    this.isSearching = false

    this.initializeElements()
    this.bindEvents()
    this.renderSavedCities()
  }

  initializeElements() {
    this.searchInput = document.getElementById("searchInput")
    this.searchBtn = document.getElementById("searchBtn")
    this.locationBtn = document.getElementById("locationBtn")
    this.errorMessage = document.getElementById("errorMessage")
    this.searchResultSection = document.getElementById("searchResultSection")
    this.searchResultContent = document.getElementById("searchResultContent")
    this.forecastSection = document.getElementById("forecastSection")
    this.forecastContent = document.getElementById("forecastContent")
    this.savedCitiesContent = document.getElementById("savedCitiesContent")
    this.popularCities = document.getElementById("popularCities")
  }

  bindEvents() {
    this.searchBtn.addEventListener("click", () => this.handleSearch())
    this.searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleSearch()
    })
    this.locationBtn.addEventListener("click", () => this.getCurrentLocation())

    this.popularCities.addEventListener("click", (e) => {
      if (e.target.classList.contains("popular-city-btn")) {
        const city = e.target.dataset.city
        this.searchInput.value = city
        setTimeout(() => this.handleSearch(), 100)
      }
    })
  }

  async fetchWeatherData(city) {
    const response = await fetch(`${this.BASE_URL}/weather?q=${city}&units=metric&appid=${this.API_KEY}`)
    if (!response.ok) {
      throw new Error("City not found. Please check the spelling and try again.")
    }
    const data = await response.json()
    return this.formatWeatherData(data)
  }

  async fetchWeatherByCoords(lat, lon) {
    const response = await fetch(`${this.BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${this.API_KEY}`)
    if (!response.ok) {
      throw new Error("Unable to fetch weather data for your location")
    }
    const data = await response.json()
    return this.formatWeatherData(data)
  }

  formatWeatherData(data) {
    return {
      name: data.name,
      country: data.sys.country,
      temp: data.main.temp,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind_speed: data.wind.speed,
      visibility: data.visibility,
      pressure: data.main.pressure,
      cloudiness: data.clouds.all,
      coord: data.coord,
    }
  }

  async fetchForecast(lat, lon) {
    const response = await fetch(`${this.BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${this.API_KEY}`)
    if (!response.ok) {
      throw new Error("Unable to fetch forecast data")
    }
    const data = await response.json()

    const dailyForecasts = {}
    data.list.forEach((item) => {
      const date = new Date(item.dt * 1000).toDateString()
      if (!dailyForecasts[date]) {
        dailyForecasts[date] = []
      }
      dailyForecasts[date].push(item)
    })

    const days = Object.keys(dailyForecasts).slice(0, 5)
    return days.map((day) => {
      const dayData = dailyForecasts[day]
      const midDayForecast = dayData[Math.floor(dayData.length / 2)]
      const maxTemp = Math.max(...dayData.map((f) => f.main.temp_max))
      const minTemp = Math.min(...dayData.map((f) => f.main.temp_min))

      const date = new Date(day)
      const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
      const dayDate = date.toLocaleDateString("en-US", { month: "short", day: "numeric" })

      return {
        date: `${dayName}, ${dayDate}`,
        day: dayName,
        icon: midDayForecast.weather[0].icon,
        maxTemp: Math.round(maxTemp),
        minTemp: Math.round(minTemp),
        description: midDayForecast.weather[0].description,
      }
    })
  }

  async handleSearch() {
    const query = this.searchInput.value.trim()
    if (!query) return

    this.setSearching(true)
    this.hideError()

    try {
      const weatherData = await this.fetchWeatherData(query)
      this.displaySearchResult(weatherData)
      const forecastData = await this.fetchForecast(weatherData.coord.lat, weatherData.coord.lon)
      this.displayForecast(forecastData)
      this.searchInput.value = ""
    } catch (error) {
      this.showError(error.message)
      this.hideSearchResult()
      this.hideForecast()
    } finally {
      this.setSearching(false)
    }
  }

  getCurrentLocation() {
    if (!navigator.geolocation) {
      this.showError("Geolocation is not supported by your browser")
      return
    }

    this.setSearching(true)
    this.hideError()

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const weatherData = await this.fetchWeatherByCoords(latitude, longitude)
          this.displaySearchResult(weatherData)
          const forecastData = await this.fetchForecast(latitude, longitude)
          this.displayForecast(forecastData)
        } catch (error) {
          this.showError(error.message)
        } finally {
          this.setSearching(false)
        }
      },
      () => {
        this.showError("Unable to access your location. Please enable location services.")
        this.setSearching(false)
      },
    )
  }

  setSearching(searching) {
    this.isSearching = searching
    this.searchBtn.disabled = searching
    this.locationBtn.disabled = searching

    if (searching) {
      this.displaySearchLoading()
    }
  }

  displaySearchLoading() {
    this.searchResultSection.classList.remove("hidden")
    this.searchResultContent.innerHTML = `
            <div class="weather-card">
                <div class="loading">
                    <div class="spinner"></div>
                    <p style="color: #d1d5db;">Fetching weather data...</p>
                </div>
            </div>
        `
  }

  displaySearchResult(weather) {
    this.searchResultSection.classList.remove("hidden")
    this.searchResultContent.innerHTML = this.createWeatherCard(weather, true)
  }

  displayForecast(forecast) {
    this.forecastSection.classList.remove("hidden")
    this.forecastContent.innerHTML = forecast
      .map(
        (day) => `
            <div class="forecast-card">
                <p class="forecast-date">${day.date}</p>
                <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" 
                     alt="${day.description}" class="forecast-icon">
                <p class="forecast-temp">${day.maxTemp}°/${day.minTemp}°</p>
                <p class="forecast-description">${day.description}</p>
            </div>
        `,
      )
      .join("")
  }

  hideSearchResult() {
    this.searchResultSection.classList.add("hidden")
  }

  hideForecast() {
    this.forecastSection.classList.add("hidden")
  }

  createWeatherCard(weather, showAddButton = false) {
    const cityExists = this.savedCities.some((city) => city.name === weather.name && city.country === weather.country)

    return `
            <div class="weather-card">
                <div class="weather-header">
                    <h3 class="weather-location">${weather.name}, ${weather.country}</h3>
                    <img src="https://openweathermap.org/img/wn/${weather.icon}@2x.png" 
                         alt="${weather.description}" class="weather-icon">
                    <div class="weather-temp">${Math.round(weather.temp)}°C</div>
                    <p class="weather-description">${weather.description}</p>
                </div>

                <div class="weather-details">
                    <div class="weather-detail">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
                            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
                            <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
                        </svg>
                        <span class="weather-detail-value">${Math.round(weather.feels_like)}°C</span>
                        <span class="weather-detail-label">Feels Like</span>
                    </div>
                    <div class="weather-detail">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span class="weather-detail-value">${weather.humidity}%</span>
                        <span class="weather-detail-label">Humidity</span>
                    </div>
                    <div class="weather-detail">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
                            <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
                            <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
                        </svg>
                        <span class="weather-detail-value">${Math.round(weather.wind_speed * 3.6)} km/h</span>
                        <span class="weather-detail-label">Wind</span>
                    </div>
                    <div class="weather-detail">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                        <span class="weather-detail-value">${Math.round(weather.visibility / 1000)} km</span>
                        <span class="weather-detail-label">Visibility</span>
                    </div>
                    <div class="weather-detail">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <circle cx="12" cy="12" r="6"/>
                            <circle cx="12" cy="12" r="2"/>
                        </svg>
                        <span class="weather-detail-value">${weather.pressure} hPa</span>
                        <span class="weather-detail-label">Pressure</span>
                    </div>
                    <div class="weather-detail">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                            <path d="m9.2 22 3-7"/>
                            <path d="m9 13-3 7"/>
                            <path d="m17 13-3 7"/>
                        </svg>
                        <span class="weather-detail-value">${weather.cloudiness}%</span>
                        <span class="weather-detail-label">Clouds</span>
                    </div>
                </div>

                ${
                  showAddButton
                    ? `
                    <button class="weather-action add-btn" onclick="weatherApp.addCityToDashboard()" ${cityExists ? "disabled" : ""}>
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M5 12h14"/>
                            <path d="M12 5v14"/>
                        </svg>
                        ${cityExists ? "Already Added" : "Add to Dashboard"}
                    </button>
                `
                    : ""
                }
            </div>
        `
  }

  addCityToDashboard() {
    const searchResult = this.getSearchResultWeather()
    if (!searchResult) return

    const cityExists = this.savedCities.some(
      (city) => city.name === searchResult.name && city.country === searchResult.country,
    )

    if (cityExists) {
      this.showError("City is already in your dashboard")
      return
    }

    this.savedCities.push(searchResult)
    this.saveCitiesToStorage()
    this.renderSavedCities()

    // Update the search result button
    this.displaySearchResult(searchResult)
  }

  getSearchResultWeather() {
    // Extract weather data from the current search result
    const card = this.searchResultContent.querySelector(".weather-card")
    if (!card) return null

    const location = card.querySelector(".weather-location").textContent
    const [name, country] = location.split(", ")
    const temp = Number.parseFloat(card.querySelector(".weather-temp").textContent)
    const description = card.querySelector(".weather-description").textContent
    const icon = card.querySelector(".weather-icon").src.match(/(\w+)@2x\.png/)[1]

    // Get details from weather-detail elements
    const details = card.querySelectorAll(".weather-detail-value")

    return {
      name,
      country,
      temp,
      description,
      icon,
      feels_like: Number.parseFloat(details[0].textContent),
      humidity: Number.parseInt(details[1].textContent),
      wind_speed: Number.parseFloat(details[2].textContent) / 3.6, // Convert back to m/s
      visibility: Number.parseFloat(details[3].textContent) * 1000, // Convert back to meters
      pressure: Number.parseInt(details[4].textContent),
      cloudiness: Number.parseInt(details[5].textContent),
      coord: { lat: 0, lon: 0 }, // Placeholder
    }
  }

  removeCityFromDashboard(index) {
    this.savedCities.splice(index, 1)
    this.saveCitiesToStorage()
    this.renderSavedCities()
  }

  renderSavedCities() {
    if (this.savedCities.length === 0) {
      this.savedCitiesContent.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
                    </svg>
                    <p>No cities added yet. Search for a city to add it to your dashboard.</p>
                </div>
            `
    } else {
      this.savedCitiesContent.innerHTML = `
                <div class="cities-grid">
                    ${this.savedCities
                      .map(
                        (city, index) => `
                        <div class="weather-card">
                            <div class="weather-header">
                                <h3 class="weather-location">${city.name}, ${city.country}</h3>
                                <img src="https://openweathermap.org/img/wn/${city.icon}@2x.png" 
                                     alt="${city.description}" class="weather-icon">
                                <div class="weather-temp">${Math.round(city.temp)}°C</div>
                                <p class="weather-description">${city.description}</p>
                            </div>

                            <div class="weather-details">
                                <div class="weather-detail">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
                                        <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
                                        <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
                                    </svg>
                                    <span class="weather-detail-value">${Math.round(city.feels_like)}°C</span>
                                    <span class="weather-detail-label">Feels Like</span>
                                </div>
                                <div class="weather-detail">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    <span class="weather-detail-value">${city.humidity}%</span>
                                    <span class="weather-detail-label">Humidity</span>
                                </div>
                                <div class="weather-detail">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"/>
                                        <path d="M9.6 4.6A2 2 0 1 1 11 8H2"/>
                                        <path d="M12.6 19.4A2 2 0 1 0 14 16H2"/>
                                    </svg>
                                    <span class="weather-detail-value">${Math.round(city.wind_speed * 3.6)} km/h</span>
                                    <span class="weather-detail-label">Wind</span>
                                </div>
                                <div class="weather-detail">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                                        <circle cx="12" cy="12" r="3"/>
                                    </svg>
                                    <span class="weather-detail-value">${Math.round(city.visibility / 1000)} km</span>
                                    <span class="weather-detail-label">Visibility</span>
                                </div>
                                <div class="weather-detail">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"/>
                                        <circle cx="12" cy="12" r="6"/>
                                        <circle cx="12" cy="12" r="2"/>
                                    </svg>
                                    <span class="weather-detail-value">${city.pressure} hPa</span>
                                    <span class="weather-detail-label">Pressure</span>
                                </div>
                                <div class="weather-detail">
                                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/>
                                        <path d="m9.2 22 3-7"/>
                                        <path d="m9 13-3 7"/>
                                        <path d="m17 13-3 7"/>
                                    </svg>
                                    <span class="weather-detail-value">${city.cloudiness}%</span>
                                    <span class="weather-detail-label">Clouds</span>
                                </div>
                            </div>

                            <button class="weather-action remove-btn" onclick="weatherApp.removeCityFromDashboard(${index})">
                                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"/>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                                Remove from Dashboard
                            </button>
                        </div>
                    `,
                      )
                      .join("")}
                </div>
            `
    }
  }

  saveCitiesToStorage() {
    localStorage.setItem("savedCities", JSON.stringify(this.savedCities))
  }

  showError(message) {
    this.errorMessage.textContent = message
    this.errorMessage.classList.remove("hidden")
    setTimeout(() => this.hideError(), 5000)
  }

  hideError() {
    this.errorMessage.classList.add("hidden")
  }
}

// Initialize the weather dashboard
const weatherApp = new WeatherDashboard()
