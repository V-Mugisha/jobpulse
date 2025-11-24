# JobPulse

A lightweight job-market frontend built with vanilla HTML, CSS, and JavaScript. Search and filter job listings in real-time using the Adzuna API—no frameworks or build tools required.

## Features & Functionality

- Search job listings by title or category
- Filter by employment type and salary range
- Sort results by relevance, salary, or date
- Customizable pagination with adjustable results per page
- Detailed job view modal with complete description and company information
- Direct "Apply" links to employer application pages

## Demo Video Link
Here is the link to the demo video on [YouTube](https://youtu.be/X7Op1uObrBs)

## Quick Start

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/V-Mugisha/jobpulse.git
   cd jobpulse
   ```

2. **Create `env.js` in the root directory:**
   ```javascript
   window.ENV = {
     ADZUNA_APP_ID: 'your_app_id',
     ADZUNA_APP_KEY: 'your_app_key',
   };
   ```
   Get credentials from [Adzuna Developer Portal](https://developer.adzuna.com/overview) (You need to have an account there)

3. **Load `env.js` first in `index.html`:**
   ```html
   <script src="env.js"></script>
   <!-- Other scripts -->
   ```

4. **Open `index.html` in your browser** — that's it!

## API Documentation

### Adzuna Job Search API

**Endpoint:** `https://api.adzuna.com/v1/api/jobs/gb/search/[PAGE_NUMBER]`

**Documentation:** [Adzuna API Docs](https://developer.adzuna.com/activedocs)

**Required Parameters:**
- `app_id` — Your Adzuna application ID (string)
- `app_key` — Your Adzuna application key (string)
- `page_number` — Page number for pagination (number)

**Optional Parameters:**
- `results_per_page` — Number of results per page
- `title_only` — Search by job title only
- `location0` — Basically the location of the job
- And more other Query Parameters

**Example Request:**
```
https://api.adzuna.com/v1/api/jobs/gb/search/1?app_id=YOUR_ID&app_key=YOUR_KEY&results_per_page=20&title_only=Tech%20Lead
```

**Sample Response:**
```json
{
  "count": 150,
  "mean": 45000,
  "results": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "created": "string",
      "redirect_url": "string",
      "location": {
        "display_name": "string",
        "area": ["string"]
      },
      "company": {
        "display_name": "string",
        "canonical_name": "string",
        "count": 0,
        "average_salary": 0
      },
      "salary_min": 0,
      "salary_max": 0,
      "contract_time": "full_time",
      "contract_type": "permanent"
    }
  ]
}
```

## Deployment

### Prerequisites
- Two Ubuntu 20.04 LTS servers running Nginx (6892-web-01 and 6892-web-02)
- One HAProxy load balancer (lb-01)
- SSH access to all machines
- GitHub repository with SSH key pair authentication

### Deploy to Web Servers

**On each web server (6892-web-01 and 6892-web-02):**

1. **Install Git:**
   ```bash
   sudo apt update
   sudo apt install git
   ```

2. **Authenticate to GitHub using SSH key pair**

3. **Clone the repository into the Nginx web directory:**
   ```bash
   cd /var/www/html/
   sudo git clone git@github.com:V-Mugisha/jobpulse.git
   ```

4. **Create the environment variables file:**
   ```bash
   cd jobpulse
   sudo vim env.js
   ```
   Add your Adzuna API credentials:
   ```javascript
   window.ENV = {
     ADZUNA_APP_ID: 'your_app_id',
     ADZUNA_APP_KEY: 'your_app_key',
   };
   ```

5. **Update Nginx configuration to serve the cloned directory files:**
   ```bash
   sudo vim /etc/nginx/sites-enabled/default
   ```
   Update the `root` directive to:
   ```nginx
   root /var/www/html/jobpulse;
   ```

6. **Restart Nginx:**
   ```bash
   sudo service nginx restart
   ```

### Load Balancer Configuration

HAProxy on `lb-01` is configured with round-robin load balancing:

```
frontend lb-frontend
        bind *:80
        mode http
        default_backend lb-backend
backend lb-backend
        balance roundrobin
        server 6892-web-01 107.21.79.99:80 check
        server 6892-web-02 44.201.120.55:80 check
```

This distributes traffic evenly between both web servers.

## Development Challenges & Solutions

**State Management:** Without a framework, accessing shared data across the app was difficult. Solved by storing global state on the `window` object and using custom `data:loaded` events to trigger reactive updates.

**Component Architecture:** Maintaining a single HTML file with thousands of lines became unmaintainable. Instead of injecting HTML from separate files, dynamically generated all UI components using JavaScript's `document.createElement()` method.

**Loading States:** Manually implemented loading indicators and error handling by dispatching custom events (`data:loaded`, `error:loading`) and having UI elements listen and respond accordingly.

**Environment Variables:** Vanilla JavaScript lacks native `.env` support. Created `env.js` file storing API credentials on the `window` object and added it to `.gitignore` to keep credentials private while remaining accessible.

## Project Structure

```
├──js
   ├── script.js       # Application logic
├── index.html       # Main HTML file
├── styles.css       # Styling
├── env.js           # Environment variables (git-ignored)
|── .gitignore       # To ignore files that should not be pushed on GitHub
└── README.md        # This file
```

## Credits

- **Adzuna API** — [Developer Docs](https://developer.adzuna.com/)
- **Lucide Icons** — [SVG icon library](https://lucide.dev/guide/packages/lucide)
- **Nginx & HAProxy** — [Server and load balancer infrastructure](https://nginx.org/)

