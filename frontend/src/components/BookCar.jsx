import { useEffect, useState } from "react";
import CarAudi from "../images/cars-big/audia1.jpg";
import CarGolf from "../images/cars-big/golf6.jpg";
import CarToyota from "../images/cars-big/toyotacamry.jpg";
import CarBmw from "../images/cars-big/bmw320.jpg";
import CarMercedes from "../images/cars-big/benz.jpg";
import CarPassat from "../images/cars-big/passatcc.jpg";
import './BookCar.css';
import { useBookings } from "../contexts/BookingContext";
import { bookingsAPI, carsAPI, apiUtils } from "../services/api";

function BookCar() {
  const { bookings, addBooking, updateBooking, deleteBooking } = useBookings();
  const [modal, setModal] = useState(false); //  class - active-modal
  const [errMsg, setErrMsg] = useState("");

  // booking car
  const [carType, setCarType] = useState("");
  const [pickUp, setPickUp] = useState("");
  const [dropOff, setDropOff] = useState("");
  const [pickTime, setPickTime] = useState("");
  const [dropTime, setDropTime] = useState("");
  const [carImg, setCarImg] = useState("");
  const [price, setPrice] = useState(0);
  const [pickUpTime, setPickUpTime] = useState("");
  const [dropOffTime, setDropOffTime] = useState("");
  const [fuelType, setFuelType] = useState("");

  // modal infos
  const [name, setName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [zipcode, setZipCode] = useState("");

  // edit state
  const [editIndex, setEditIndex] = useState(null);

  // car prices
  const carPrices = {
    "Audi A1 S-Line": 500,
    "VW Golf 6": 300 ,
    "Toyota Camry": 400,
    "BMW 320 ModernLine": 500,
    "Mercedes-Benz GLK": 600,
    "VW Passat CC": 300,
  };

  // taking value of modal inputs
  const handleName = (e) => {
    setName(e.target.value);
  };

  const handleLastName = (e) => {
    setLastName(e.target.value);
  };

  const handlePhone = (e) => {
    setPhone(e.target.value);
  };

  const handleAge = (e) => {
    setAge(e.target.value);
  };

  const handleEmail = (e) => {
    setEmail(e.target.value);
  };

  const handleAddress = (e) => {
    setAddress(e.target.value);
  };

  const handleCity = (e) => {
    setCity(e.target.value);
  };

  const handleZip = (e) => {
    setZipCode(e.target.value);
  };

  // open modal when all inputs are fulfilled and availability is verified
  const openModal = async (e) => {
    e.preventDefault();
    
    // If the modal is already open, close it and return immediately
    if (modal) {
      setModal(false);
      return;
    }

    const errorMsg = document.querySelector(".error-message");
    errorMsg.style.display = "none";

    const isAllFieldsFilled = 
      pickUp !== "" && pickUp !== "Select pick up location" &&
      dropOff !== "" && dropOff !== "Select drop off location" &&
      pickTime !== "" &&
      dropTime !== "" &&
      carType !== "" && carType !== "Select your car type" &&
      fuelType !== "" && fuelType !== "Select fuel type" &&
      pickUpTime !== "" &&
      dropOffTime !== "";

    if (!isAllFieldsFilled) {
      errorMsg.innerHTML = 'All fields required! <i class="fa-solid fa-xmark"></i>';
      errorMsg.style.display = "flex";
      const closeBtn = errorMsg.querySelector(".fa-xmark");
      if (closeBtn) {
        closeBtn.onclick = () => { errorMsg.style.display = "none"; };
      }
      return;
    }

    try {
      // Query API for available cars
      const res = await carsAPI.getAvailableCars(pickUp, pickTime, dropTime);
      const availableCars = res?.cars || [];
      
      const isAvailable = availableCars.some(c => {
        // Compare brand & model / name
        const dbName = c.name;
        if (carType === "VW Golf 6" && dbName === "Golf 6") return true;
        return dbName === carType;
      });

      if (!isAvailable) {
        errorMsg.innerHTML = 'Car not available! <i class="fa-solid fa-xmark"></i>';
        errorMsg.style.display = "flex";
        const closeBtn = errorMsg.querySelector(".fa-xmark");
        if (closeBtn) {
          closeBtn.onclick = () => { errorMsg.style.display = "none"; };
        }
        return;
      }

      // If available, proceed to open modal
      setModal(true);
      const modalDiv = document.querySelector(".booking-modal");
      if (modalDiv) modalDiv.scroll(0, 0);
    } catch (err) {
      console.error("Availability check failed:", err);
      errorMsg.innerHTML = 'Error checking car availability. Please try again. <i class="fa-solid fa-xmark"></i>';
      errorMsg.style.display = "flex";
      const closeBtn = errorMsg.querySelector(".fa-xmark");
      if (closeBtn) {
        closeBtn.onclick = () => { errorMsg.style.display = "none"; };
      }
    }
  };

  // disable page scroll when modal is displayed
  useEffect(() => {
    if (modal === true) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [modal]);

  // Add booking
  const confirmBooking = async (e) => {
    e.preventDefault();
    // Require sign-in to create server booking
    if (!apiUtils.isAuthenticated()) {
      setErrMsg("Please sign in to complete your booking.");
      return;
    }

    const payload = {
      carType,
      pickUp,
      dropOff,
      pickTime,
      dropTime,
      pickUpTime,
      dropOffTime,
      name,
      lastName,
      phone,
      age,
      email,
      address,
      city,
      zipcode,
      fuelType,
    };

    try {
      setErrMsg("");
      // Call backend to persist booking
      await bookingsAPI.createBooking(payload);

      // Also add to local UI list for immediate feedback
      if (editIndex !== null) {
        const bookingToUpdate = bookings[editIndex];
        updateBooking(bookingToUpdate.id, payload);
        setEditIndex(null);
      } else {
        addBooking(payload);
      }

      setModal(false);
      const doneMsg = document.querySelector(".booking-done");
      if (doneMsg) doneMsg.style.display = "flex";
    } catch (err) {
      console.error("Create booking failed:", err);
      setErrMsg(err?.message || "Failed to create booking. Please try again.");
    }
  };

  // Edit booking
  const handleEdit = (idx) => {
    const booking = bookings[idx];
    setCarType(booking.carType);
    setPickUp(booking.pickUp);
    setDropOff(booking.dropOff);
    setPickTime(booking.pickTime);
    setDropTime(booking.dropTime);
    setPickUpTime(booking.pickUpTime);
    setDropOffTime(booking.dropOffTime);
    setFuelType(booking.fuelType);
    setName(booking.name);
    setLastName(booking.lastName);
    setPhone(booking.phone);
    setAge(booking.age);
    setEmail(booking.email);
    setAddress(booking.address);
    setCity(booking.city);
    setZipCode(booking.zipcode);
    setEditIndex(idx);
    setModal(true);
  };

  // Delete booking
  const handleDelete = (idx) => {
    const bookingToDelete = bookings[idx];
    deleteBooking(bookingToDelete.id);
  };

  // taking value of booking inputs
  const handleCar = (e) => {
    setCarType(e.target.value);
    setCarImg(e.target.value);
    setPrice(carPrices[e.target.value] || 0);
  };

  const handlePick = (e) => {
    setPickUp(e.target.value);
  };

  const handleDrop = (e) => {
    setDropOff(e.target.value);
  };

  const handlePickTime = (e) => {
    setPickTime(e.target.value);
  };

  const handleDropTime = (e) => {
    setDropTime(e.target.value);
  };

  // based on value name show car img
  let imgUrl;
  switch (carImg) {
    case "Audi A1 S-Line":
      imgUrl = CarAudi;
      break;
    case "VW Golf 6":
      imgUrl = CarGolf;
      break;
    case "Toyota Camry":
      imgUrl = CarToyota;
      break;
    case "BMW 320 ModernLine":
      imgUrl = CarBmw;
      break;
    case "Mercedes-Benz GLK":
      imgUrl = CarMercedes;
      break;
    case "VW Passat CC":
      imgUrl = CarPassat;
      break;
    default:
      imgUrl = "";
  }

  // hide message
  const hideMessage = () => {
    const doneMsg = document.querySelector(".booking-done");
    doneMsg.style.display = "none";
  };

  const getTotalHours = () => {
    if (!pickTime || !dropTime || !pickUpTime || !dropOffTime) return 0;
    const start = new Date(`${pickTime}T${pickUpTime}`);
    const end = new Date(`${dropTime}T${dropOffTime}`);
    const diff = (end - start) / (1000 * 60 * 60);
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  const getTotalDays = () => {
    if (!pickTime || !dropTime || !pickUpTime || !dropOffTime) return 0;
    const start = new Date(`${pickTime}T${pickUpTime}`);
    const end = new Date(`${dropTime}T${dropOffTime}`);
    const diff = (end - start) / (1000 * 60 * 60 * 24);
    return diff > 0 ? Math.ceil(diff) : 0;
  };

  // Total rent logic
  let totalRent = 0;
  if (getTotalHours() <= 24) {
    totalRent = price * getTotalHours();
  } else {
    totalRent = price * 24 * getTotalDays();
  }

  return (
     <>
     
      <section id="booking-section" className="book-section">
        {/* overlay */}
        <div
          onClick={openModal}
          className={`modal-overlay ${modal ? "active-modal" : ""}`}
        ></div>

        <div className="container">
          <div className="book-content">
            <div className="book-content__box">
              <h2>Book a car</h2>

              <p className="error-message">
                All fields required! <i className="fa-solid fa-xmark"></i>
              </p>

              <p className="booking-done">
                Check your email to confirm an order.{" "}
                <i onClick={hideMessage} className="fa-solid fa-xmark"></i>
              </p>

              <form className="box-form">
                <div className="box-form__car-type">
                  <label>
                    <i className="fa-solid fa-car"></i> &nbsp; Select Your Car
                    Type <b>*</b>
                  </label>
                  <select value={carType} onChange={handleCar}>
                    <option>Select your car type</option>
                    <option value="Audi A1 S-Line">Audi A1 S-Line</option>
                    <option value="VW Golf 6">VW Golf 6</option>
                    <option value="Toyota Camry">Toyota Camry</option>
                    <option value="BMW 320 ModernLine">
                      BMW 320 ModernLine
                    </option>
                    <option value="Mercedes-Benz GLK">Mercedes-Benz GLK</option>
                    <option value="VW Passat CC">VW Passat CC</option>
                  </select>
                  {carType && getTotalHours() > 0 && getTotalHours() <= 24 && (
                    <div style={{ marginTop: "10px", color: "#333" }}>
                      <b>Price: ₹{price} / hour</b>
                    </div>
                  )}
                  {carType && getTotalHours() > 24 && (
                    <div style={{ marginTop: "10px", color: "#333" }}>
                      <b>Price: ₹{price * 24} / day</b>
                    </div>
                  )}
                  {carType && getTotalHours() > 0 && (
                    <div style={{ marginTop: "10px", color: "#333" }}>
                      <b>
                        Total Rent: ₹{totalRent} ({getTotalHours() <= 24 ? `${getTotalHours()} hours` : `${getTotalDays()} days`})
                      </b>
                    </div>
                  )}
                </div>

                <div className="box-form__car-type">
                  <label>
                    <i className="fa-solid fa-location-dot"></i> &nbsp; Pick-up{" "}
                    <b>*</b>
                  </label>
                  <select value={pickUp} onChange={handlePick}>
                    <option>Select pick up location</option>
                    <option>Delhi</option>
                    <option>Kolkata</option>
                    <option>Bengaluru</option>
                    <option>Mumbai</option>
                    <option>Goa</option>
                  </select>
                </div>

                <div className="box-form__car-type">
                  <label>
                    <i className="fa-solid fa-location-dot"></i> &nbsp; Drop-off{" "}
                    <b>*</b>
                  </label>
                  <select value={dropOff} onChange={handleDrop}>
                    <option>Select drop off location</option>
                    <option>Delhi</option>
                    <option>Kolkata</option>
                    <option>Bengaluru</option>
                    <option>Mumbai</option>
                    <option>Goa</option>
                  </select>
                </div>

                <div className="box-form__car-time">
                  <label htmlFor="picktime">
                    <i className="fa-regular fa-calendar-days "></i> &nbsp;
                    Pick-up <b>*</b>
                  </label>
                  <input
                    id="picktime"
                    value={pickTime}
                    onChange={handlePickTime}
                    type="date"
                  ></input>
                </div>

                <div className="box-form__car-time">
                  <label htmlFor="droptime">
                    <i className="fa-regular fa-calendar-days "></i> &nbsp;
                    Drop-off <b>*</b>
                  </label>
                  <input
                    id="droptime"
                    value={dropTime}
                    onChange={handleDropTime}
                    type="date" >
                    </input>
                </div>
                <div className="box-form__car-type">
                  <label>
                    <i className="fa-solid fa-gas-pump"></i> &nbsp; Fuel Type{" "}
                    <b>*</b>
                  </label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                  >
                    <option>Select fuel type</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                    
                  </select>
                </div>
                <div className="box-form__car-time">
                  <label htmlFor="pickup-time">
                    <i className="fa-regular fa-clock"></i> &nbsp; Pick-up Time
                    <b>*</b>
                  </label>
                  <input
                    id="pickup-time"
                    value={pickUpTime}
                    onChange={(e) => setPickUpTime(e.target.value)}
                    type="time"
                    placeholder="Pick-up time"
                  />
                </div>

                <div className="box-form__car-time">
                  <label htmlFor="dropoff-time">
                    <i className="fa-regular fa-clock"></i> &nbsp; Drop-off Time
                    <b>*</b>
                  </label>
                  <input
                    id="dropoff-time"
                    value={dropOffTime}
                    onChange={(e) => setDropOffTime(e.target.value)}
                    type="time"
                    placeholder="Drop-off time"
                  />
                </div>

                <button onClick={openModal} type="submit">
                  Search
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* modal ------------------------------------ */}

      <div className={`booking-modal ${modal ? "active-modal" : ""}`}>
        {/* title */}
        <div className="booking-modal__title">
          <h2>Complete Reservation</h2>
          <i onClick={openModal} className="fa-solid fa-xmark"></i>
        </div>
        {errMsg && (
          <div style={{
            background: "#fdecea",
            color: "#b71c1c",
            padding: "10px 14px",
            borderRadius: 6,
            margin: "10px 16px"
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }}></i>
            {errMsg}
          </div>
        )}
        {/* message */}
        <div className="booking-modal__message">
          <h4>
            <i className="fa-solid fa-circle-info"></i> Upon completing this
            reservation enquiry, you will receive:
          </h4>
          <p>
            Your rental voucher to produce on arrival at the rental desk and a
            toll-free customer support number.
          </p>
        </div>
        {/* car info */}
        <div className="booking-modal__car-info">
          <div className="dates-div">
            <div className="booking-modal__car-info__dates">
              <h5>Location & Date</h5>
              <span>
                <i className="fa-solid fa-location-dot"></i>
                <div>
                  <h6>Pick-Up Date & Time</h6>
                  <p>
                    {pickTime} {pickUpTime && ` / ${pickUpTime}`}
                  </p>
                </div>
              </span>
            </div>

            <div className="booking-modal__car-info__dates">
              <span>
                <i className="fa-solid fa-location-dot"></i>
                <div>
                  <h6>Drop-Off Date & Time</h6>
                  <p>
                    {dropTime} {dropOffTime && ` / ${dropOffTime}`}
                  </p>
                </div>
              </span>
            </div>

            <div className="booking-modal__car-info__dates">
              <span>
                <i className="fa-solid fa-calendar-days"></i>
                <div>
                  <h6>Pick-Up Location</h6>
                  <p>{pickUp}</p>
                </div>
              </span>
              
            </div>

            <div className="booking-modal__car-info__dates">
              <span>
                <i className="fa-solid fa-calendar-days"></i>
                <div>
                  <h6>Drop-Off Location</h6>
                  <p>{dropOff}</p>
                </div>
              </span>
            </div>
             {/* Price show */}
            <div className="booking-modal__car-info__dates">
              <span>
                <i className="fa-solid fa-indian-rupee-sign"></i>
                <div>
                  <h6>Price</h6>
                  <p>₹{price} / hour</p>
                  <p>
                    <b>
                      Total Rent: ₹{totalRent} ({getTotalHours() <= 24 ? `${getTotalHours()} hours` : `${getTotalDays()} days`})
                    </b>
                  </p>
                </div>
              </span>
              </div>
            {/* Fuel Type show */}
            <div className="booking-modal__car-info__dates">
              <span>
                <i className="fa-solid fa-gas-pump"></i>
                <div>
                  <h6>Fuel Type</h6>
                  <p>{fuelType ? fuelType : "Not selected"}</p>
                </div>
              </span>
            </div>
          </div>
          <div className="booking-modal__car-info__model">
            <h5>
              <span>Car -</span> {carType}
            </h5>
            {imgUrl && <img src={imgUrl} alt="car_img" />}
          </div>
          
       </div>
        {/* personal info */}
        <div className="booking-modal__person-info">
          <h4>Personal Information</h4>
          <form className="info-form">
            <div className="info-form__2col">
              <span>
                <label>
                  First Name <b>*</b>
                </label>
                <input
                  value={name}
                  onChange={handleName}
                  type="text"
                  placeholder="Enter your first name"
                ></input>
                <p className="error-modal">This field is required.</p>
              </span>

              <span>
                <label>
                  Last Name <b>*</b>
                </label>
                <input
                  value={lastName}
                  onChange={handleLastName}
                  type="text"
                  placeholder="Enter your last name"
                ></input>
                <p className="error-modal ">This field is required.</p>
              </span>

              <span>
                <label>
                  Phone Number <b>*</b>
                </label>
                <input
                  value={phone}
                  onChange={handlePhone}
                  type="tel"
                  placeholder="Enter your phone number"
                ></input>
                <p className="error-modal">This field is required.</p>
              </span>

              <span>
                <label>
                  Age <b>*</b>
                </label>
                <input
                  value={age}
                  onChange={handleAge}
                  type="number"
                  placeholder="18"
                ></input>
                <p className="error-modal ">This field is required.</p>
              </span>
            </div>

            <div className="info-form__1col">
              <span>
                <label>
                  Email <b>*</b>
                </label>
                <input
                  value={email}
                  onChange={handleEmail}
                  type="email"
                  placeholder="Enter your email address"
                ></input>
                <p className="error-modal">This field is required.</p>
              </span>

              <span>
                <label>
                  Address <b>*</b>
                </label>
                <input
                  value={address}
                  onChange={handleAddress}
                  type="text"
                  placeholder="Enter your street address"
                ></input>
                <p className="error-modal ">This field is required.</p>
              </span>
            </div>

            <div className="info-form__2col">
              <span>
                <label>
                  City <b>*</b>
                </label>
                <input
                  value={city}
                  onChange={handleCity}
                  type="text"
                  placeholder="Enter your city"
                ></input>
                <p className="error-modal">This field is required.</p>
              </span>

              <span>
                <label>
                  Zip Code <b>*</b>
                </label>
                <input
                  value={zipcode}
                  onChange={handleZip}
                  type="text"
                  placeholder="Enter your zip code"
                ></input>
                <p className="error-modal ">This field is required.</p>
              </span>
            </div>

            <span className="info-form__checkbox">
              <input type="checkbox"></input>
              <p>Please send me latest news and updates</p>
            </span>

            <div className="reserve-button">
              <button onClick={confirmBooking}>Reserve Now</button>
            </div>
          </form>
        </div>
      </div>

      {/* Booking List Section */}
      <section className="booking-list-section">
  <h2>Car Bookings</h2>
  {bookings.length === 0 ? (
    <h1><p>No bookings yet.</p></h1>
  ) : (
    <div className="booking-cards-list">
      {bookings.map((booking, idx) => {
        // Price calculation
        let bookingPrice = 0;
        let totalHours = 0;
        let totalDays = 0;
        if (
          booking.pickTime &&
          booking.dropTime &&
          booking.pickUpTime &&
          booking.dropOffTime
        ) {
          const start = new Date(`${booking.pickTime}T${booking.pickUpTime}`);
          const end = new Date(`${booking.dropTime}T${booking.dropOffTime}`);
          totalHours = (end - start) / (1000 * 60 * 60);
          totalDays = (end - start) / (1000 * 60 * 60 * 24);
          totalHours = totalHours > 0 ? Math.ceil(totalHours) : 0;
          totalDays = totalDays > 0 ? Math.ceil(totalDays) : 0;
        }
        const carPrices = {
          "Audi A1 S-Line": 500,
          "VW Golf 6": 300,
          "Toyota Camry": 400,
          "BMW 320 ModernLine": 500,
          "Mercedes-Benz GLK": 600,
          "VW Passat CC": 300,
        };
        const price = carPrices[booking.carType] || 0;
        if (totalHours <= 24 && totalHours > 0) {
          bookingPrice = price * totalHours;
        } else if (totalDays > 0) {
          bookingPrice = price * 24 * totalDays;
        } else {
          bookingPrice = 0;
        }
        return (
          <div className="booking-card" key={idx}>
   <h3>Car Name : {booking.carType}</h3>
  <div className="row">
  <b>Name:</b>{booking.name} {booking.lastName}
  <b>Age:</b> {booking.age} 
  <b>Phone:</b> {booking.phone} 
  <b>Email:</b> {booking.email}
  </div>
  <div className="row">
  <b>Address:</b> {booking.address}
  <b>City:</b> {booking.city}
  <b>Zip:</b> {booking.zipcode}
  </div>
  <div className="row">
  <b>Pick-Up:</b>{booking.pickUp}
  <b>Drop-Off:</b> {booking.dropOff}
  <b>Pick-Up Date:</b> {booking.pickTime}
  <b>Drop-Off DateDate:</b> {booking.dropTime}
  </div>
  <div className="row">
  <b>Pick-Up Time:</b> {booking.pickUpTime}
  <b>Drop-Off Time:</b> {booking.dropOffTime}
  <b>Price:</b> ₹{bookingPrice}
  <b>Fuel Type:</b> {booking.fuelType}
  </div>
  <div className="booking-card-actions">
    <button onClick={() => handleEdit(idx)}>Edit</button>
    <button onClick={() => handleDelete(idx)}>Delete</button>
  </div>
</div>
        );
      })}
    </div>
  )}
</section>
      
    </>
  );
}

export default BookCar;
