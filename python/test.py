from selenium import webdriver
import time

# Make headless
options = webdriver.ChromeOptions()
options.add_argument("--headless")
options.add_argument("--window-size=%s" % "1920,1080")

browser = webdriver.Chrome(options)
browser.get('http://localhost:5173/ml')

time.sleep(5)
browser.close()
print("closed")

# https://scikit-learn.org/stable/modules/grid_search.html