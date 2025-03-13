import React, { useState, useEffect, useRef } from 'react';

const MultiPathOptimizationMap = () => {
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [optimizationCriteria, setOptimizationCriteria] = useState('distance');
  const [isCalculating, setIsCalculating] = useState(false);
  const [kakaoMap, setKakaoMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [polylines, setPolylines] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [searchType, setSearchType] = useState('keyword'); // 'keyword' 또는 'address'
  const mapRef = useRef(null);
  const geocoder = useRef(null);
  const placesService = useRef(null);

  // 카카오맵 API 로드 및 초기화
  useEffect(() => {
    const loadKakaoMap = () => {
      try {
        // 이미 카카오맵 스크립트가 로드되어 있는지 확인
        if (window.kakao && window.kakao.maps) {
          console.log('Kakao Maps API already loaded');
          initMap();
          return;
        }

        console.log('Loading Kakao Maps API...');
        const script = document.createElement('script');
        script.async = true;
        
        // API 키 설정 및 디버깅
        const KAKAO_MAP_API_KEY = process.env.REACT_APP_KAKAO_MAP_API_KEY;
        console.log('환경 변수 확인:', {
          'REACT_APP_KAKAO_MAP_API_KEY 존재 여부': !!process.env.REACT_APP_KAKAO_MAP_API_KEY,
          'process.env 키 목록': Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')),
          'NODE_ENV': process.env.NODE_ENV
        });
        
        if (!KAKAO_MAP_API_KEY) {
          console.error('Kakao Maps API key is not defined');
          alert('카카오맵 API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.');
          return;
        }
        
        script.src = `${window.location.protocol}//dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAP_API_KEY}&libraries=services&autoload=false`;
        
        script.onerror = () => {
          console.error('Failed to load Kakao Maps API');
        };
        
        script.onload = () => {
          console.log('Kakao Maps API script loaded');
          window.kakao.maps.load(() => {
            console.log('Kakao Maps API initialized');
            initMap();
          });
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Error loading Kakao Maps:', error);
      }
    };

    loadKakaoMap();
    
    // 컴포넌트 언마운트 시 정리
    return () => {
      try {
        if (markers.length > 0) {
          markers.forEach(marker => {
            if (marker.marker) marker.marker.setMap(null);
            if (marker.infowindow) marker.infowindow.close();
          });
        }
        
        if (polylines.length > 0) {
          polylines.forEach(polyline => {
            if (polyline) polyline.setMap(null);
          });
        }

        // 지도 인스턴스 제거
        if (kakaoMap) {
          setKakaoMap(null);
        }
      } catch (error) {
        console.error('Error cleaning up map:', error);
      }
    };
  }, []); // 의존성 배열을 비워서 한 번만 실행되도록 수정

  // 지도 초기화 함수
  const initMap = () => {
    try {
      if (!mapRef.current) {
        console.error('Map container not found');
        return;
      }

      console.log('Initializing map...');
      const options = {
        center: new window.kakao.maps.LatLng(37.5665, 126.9780),
        level: 7
      };
      
      const map = new window.kakao.maps.Map(mapRef.current, options);
      setKakaoMap(map);
      
      // 지도 로드 완료 후 사이즈 재조정
      window.kakao.maps.event.addListener(map, 'tilesloaded', () => {
        map.relayout();
      });
      
      if (!window.kakao.maps.services) {
        console.error('Kakao Maps Services library not loaded');
        return;
      }
      
      geocoder.current = new window.kakao.maps.services.Geocoder();
      placesService.current = new window.kakao.maps.services.Places();
      console.log('Map and Services initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  };

  // 검색 함수 수정
  const searchPlaces = () => {
    if (!newLocation.trim()) {
      console.log('검색어가 입력되지 않았습니다.');
      return;
    }
    
    if (!kakaoMap) {
      console.error('지도가 초기화되지 않았습니다.');
      return;
    }
    
    setIsSearching(true);
    setSearchResults([]);

    if (searchType === 'keyword') {
      if (!placesService.current) {
        console.error('Places service not initialized');
        return;
      }
      placesService.current.keywordSearch(newLocation, (data, status) => handleSearchResults(data, status));
    } else {
      if (!geocoder.current) {
        console.error('Geocoder service not initialized');
        return;
      }
      geocoder.current.addressSearch(newLocation, (data, status) => handleSearchResults(data, status));
    }
  };

  // 검색 결과 처리 함수 수정
  const handleSearchResults = (data, status) => {
    console.log('검색 결과:', { status, data });
    
    if (status === window.kakao.maps.services.Status.OK) {
      const results = data.map(item => ({
        id: String(Date.now()) + Math.random(),
        name: searchType === 'keyword' ? item.place_name : item.address_name,
        lat: parseFloat(item.y),
        lng: parseFloat(item.x),
        address: item.address_name,
        roadAddress: item.road_address?.address_name,
        category: searchType === 'keyword' ? item.category_name : '주소',
        phone: item.phone
      }));
      
      console.log('처리된 결과:', results);
      setSearchResults(results);
    } else if (status === window.kakao.maps.services.Status.ZERO_RESULT) {
      console.log('검색 결과가 없습니다.');
      alert('검색 결과가 없습니다.');
    } else {
      console.error('검색 실패:', status);
      alert('검색 중 오류가 발생했습니다.');
    }
    
    setIsSearching(false);
  };
  
  // 위치 선택 시 시작점/끝점 설정 여부 확인
  const handleLocationSelect = (location) => {
    if (!startPoint) {
      setStartPoint(location.id);
      selectLocation(location);
    } else if (!endPoint) {
      setEndPoint(location.id);
      selectLocation(location);
    } else {
      selectLocation(location);
    }
  };

  // 검색 결과에서 위치 선택
  const selectLocation = (location) => {
    const newLoc = {
      id: Date.now(),
      name: location.name,
      lat: location.lat,
      lng: location.lng,
      address: location.address,
      roadAddress: location.roadAddress,
      phone: location.phone,
      category: location.category
    };
    
    const newLocations = [...locations, newLoc];
    setLocations(newLocations);
    
    // 마커 추가
    addMarkerToMap(newLoc);
    
    // 지도 중심 및 줌 조정
    updateMapBounds(newLocations);
    
    // 검색 초기화
    setNewLocation('');
    setSearchResults([]);
  };

  // 마커 추가 함수
  const addMarkerToMap = (location) => {
    if (!kakaoMap) {
      console.error('지도가 초기화되지 않았습니다.');
      return;
    }
    
    console.log('마커 추가:', location);
    
    try {
      // 마커 생성
      const markerPosition = new window.kakao.maps.LatLng(location.lat, location.lng);
      const marker = new window.kakao.maps.Marker({
        position: markerPosition,
        map: kakaoMap
      });
      
      // 인포윈도우 생성
      const iwContent = `<div style="padding:5px;">${location.name}</div>`;
      const infowindow = new window.kakao.maps.InfoWindow({
        content: iwContent,
        removable: true
      });
      
      // 마커 클릭 시 인포윈도우 표시
      window.kakao.maps.event.addListener(marker, 'click', function() {
        markers.forEach(m => m.infowindow.close());
        infowindow.open(kakaoMap, marker);
      });
      
      // 마커를 상태에 저장
      setMarkers(prev => {
        console.log('마커 상태 업데이트:', [...prev, { marker, infowindow, location }]);
        return [...prev, { marker, infowindow, location }];
      });
      
      console.log('마커가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('마커 추가 중 오류 발생:', error);
    }
  };

  // 지도 영역 조정
  const updateMapBounds = (locs) => {
    if (!kakaoMap || locs.length === 0) return;
    
    // 모든 위치를 포함하는 영역 생성
    const bounds = new window.kakao.maps.LatLngBounds();
    
    locs.forEach(loc => {
      bounds.extend(new window.kakao.maps.LatLng(loc.lat, loc.lng));
    });
    
    // 지도 영역 설정
    kakaoMap.setBounds(bounds);
  };

  // 위치 제거 함수
  const removeLocation = (id) => {
    if (id === startPoint) {
      setStartPoint(null);
    }
    if (id === endPoint) {
      setEndPoint(null);
    }
    
    // 위치 목록에서 제거
    const newLocations = locations.filter(loc => loc.id !== id);
    setLocations(newLocations);
    
    // 마커 제거
    const targetMarkerIndex = markers.findIndex(m => m.location.id === id);
    if (targetMarkerIndex !== -1) {
      markers[targetMarkerIndex].marker.setMap(null);
      markers[targetMarkerIndex].infowindow.close();
      const newMarkers = markers.filter((_, index) => index !== targetMarkerIndex);
      setMarkers(newMarkers);
    }
    
    // 경로가 있으면 초기화
    if (optimizedRoute.length > 0) {
      setOptimizedRoute([]);
      clearRouteDisplay();
    }
    
    // 지도 영역 업데이트
    if (newLocations.length > 0) {
      updateMapBounds(newLocations);
    }
  };

  // 두 위치 간의 거리 계산 (하버사인 공식)
  const calculateDistance = (loc1, loc2) => {
    const R = 6371; // 지구 반경 (km)
    const dLat = deg2rad(loc2.lat - loc1.lat);
    const dLng = deg2rad(loc2.lng - loc1.lng);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(loc1.lat)) * Math.cos(deg2rad(loc2.lat)) * 
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };

  // 거리 행렬 생성
  const createDistanceMatrix = (locs) => {
    const matrix = Array(locs.length).fill().map(() => Array(locs.length).fill(0));
    
    for (let i = 0; i < locs.length; i++) {
      for (let j = i + 1; j < locs.length; j++) {
        const distance = calculateDistance(locs[i], locs[j]);
        matrix[i][j] = distance;
        matrix[j][i] = distance; // 대칭 행렬
      }
    }
    
    return matrix;
  };

  // 2-Opt 알고리즘으로 경로 최적화
  const twoOptSwap = (route, i, j) => {
    const newRoute = [...route];
    // i+1부터 j까지 역순으로 변경
    let start = i + 1;
    let end = j;
    while (start < end) {
      const temp = newRoute[start];
      newRoute[start] = newRoute[end];
      newRoute[end] = temp;
      start++;
      end--;
    }
    return newRoute;
  };

  const calculateTotalDistance = (route, distanceMatrix) => {
    let totalDistance = 0;
    for (let i = 0; i < route.length - 1; i++) {
      totalDistance += distanceMatrix[route[i]][route[i + 1]];
    }
    return totalDistance;
  };

  const twoOptAlgorithm = (locs, distanceMatrix) => {
    // 초기 경로: 주어진 순서대로
    let route = [...Array(locs.length).keys()];
    let bestDistance = calculateTotalDistance(route, distanceMatrix);
    let improved = true;
    let iterations = 0;
    const maxIterations = 100; // 무한 루프 방지
    
    while (improved && iterations < maxIterations) {
      improved = false;
      iterations++;
      
      for (let i = 0; i < route.length - 2; i++) {
        for (let j = i + 2; j < route.length; j++) {
          const newRoute = twoOptSwap(route, i, j);
          const newDistance = calculateTotalDistance(newRoute, distanceMatrix);
          
          if (newDistance < bestDistance) {
            route = newRoute;
            bestDistance = newDistance;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }
    
    return route.map(index => locs[index]);
  };

  // 경로 계산 함수
  const calculateOptimalRoute = () => {
    if (locations.length < 2) {
      alert('최소 2개 이상의 위치를 입력해주세요.');
      return;
    }

    if (!startPoint || !endPoint) {
      alert('시작점과 도착점을 모두 선택해주세요.');
      return;
    }

    setIsCalculating(true);
    
    try {
      console.log('경로 계산 시작:', locations);
      
      // 시작점과 끝점을 제외한 중간 경유지들만 최적화
      const startLoc = locations.find(loc => loc.id === startPoint);
      const endLoc = locations.find(loc => loc.id === endPoint);
      const middlePoints = locations.filter(loc => loc.id !== startPoint && loc.id !== endPoint);
      
      // 중간 경유지들에 대해서만 거리 행렬 생성 및 최적화
      const distanceMatrix = createDistanceMatrix(middlePoints);
      const optimizedMiddlePoints = middlePoints.length > 0 ? twoOptAlgorithm(middlePoints, distanceMatrix) : [];
      
      // 최종 경로: 시작점 + 최적화된 중간경로 + 끝점
      const finalRoute = [startLoc, ...optimizedMiddlePoints, endLoc];
      console.log('계산된 최적 경로:', finalRoute);
      
      displayOptimizedRoute(finalRoute);
      setOptimizedRoute(finalRoute);
      setIsCalculating(false);
    } catch (error) {
      console.error('경로 계산 중 오류 발생:', error);
      setIsCalculating(false);
      alert('경로 계산 중 오류가 발생했습니다.');
    }
  };

  // 지도에 경로 표시
  const displayOptimizedRoute = (route) => {
    if (!kakaoMap || !route || route.length < 2) {
      console.error('지도가 초기화되지 않았거나 경로가 충분하지 않습니다.');
      return;
    }
    
    console.log('최적화된 경로 표시 시작:', route);
    
    try {
      // 좌표 유효성 검사
      const validRoute = route.filter(loc => {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number' || 
            isNaN(loc.lat) || isNaN(loc.lng) || !isFinite(loc.lat) || !isFinite(loc.lng)) {
          console.error('유효하지 않은 좌표:', loc);
          return false;
        }
        return true;
      });

      if (validRoute.length < 2) {
        console.error('유효한 좌표가 2개 미만입니다.');
        return;
      }

      console.log('유효한 경로 좌표:', validRoute);

      // 기존 마커와 경로 제거
      clearRouteDisplay();
      markers.forEach(marker => {
        if (marker.marker) marker.marker.setMap(null);
        if (marker.infowindow) marker.infowindow.close();
      });

      const newMarkers = [];
      const pathCoordinates = [];

      // 각 위치에 마커 생성 및 경로 좌표 수집
      validRoute.forEach((loc, index) => {
        try {
          const position = new window.kakao.maps.LatLng(loc.lat, loc.lng);
          pathCoordinates.push(position);

          // 마커 이미지 설정
          const markerSize = new window.kakao.maps.Size(35, 35);
          const markerImage = new window.kakao.maps.MarkerImage(
            `https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_number_blue_${index + 1}.png`,
            markerSize
          );

          // 마커 생성
          const marker = new window.kakao.maps.Marker({
            position: position,
            map: kakaoMap,
            image: markerImage
          });

          // 인포윈도우 내용
          const nextLocation = index < validRoute.length - 1 ? validRoute[index + 1] : null;
          const distance = nextLocation ? calculateDistance(loc, nextLocation) : null;

          const iwContent = `
            <div style="padding:10px;min-width:200px;">
              <div style="font-weight:bold;font-size:14px;margin-bottom:5px;">
                ${index + 1}. ${loc.name}
              </div>
              <div style="font-size:12px;color:#666;margin-bottom:5px;">
                ${loc.roadAddress || loc.address}
              </div>
              ${distance !== null ? 
                `<div style="font-size:12px;color:#2196F3;margin-top:5px;border-top:1px solid #eee;padding-top:5px;">
                  다음 지점까지: ${distance.toFixed(2)}km
                </div>` : ''}
            </div>
          `;

          const infowindow = new window.kakao.maps.InfoWindow({
            content: iwContent,
            removable: true
          });

          // 마커 클릭 이벤트
          window.kakao.maps.event.addListener(marker, 'click', function() {
            newMarkers.forEach(m => m.infowindow.close());
            infowindow.open(kakaoMap, marker);
          });

          newMarkers.push({ marker, infowindow, location: loc });
          console.log(`마커 ${index + 1} 생성 완료:`, loc.name);
        } catch (error) {
          console.error(`위치 ${index + 1} 처리 중 오류:`, error);
        }
      });

      // 경로선 그리기
      if (pathCoordinates.length >= 2) {
        try {
          const polyline = new window.kakao.maps.Polyline({
            path: pathCoordinates,
            strokeWeight: 4,
            strokeColor: '#2196F3',
            strokeOpacity: 0.7,
            strokeStyle: 'solid'
          });

          polyline.setMap(kakaoMap);
          setPolylines([polyline]);
          console.log('경로선 그리기 완료');
        } catch (error) {
          console.error('경로선 그리기 중 오류:', error);
        }
      }

      // 마커 상태 업데이트
      setMarkers(newMarkers);

      // 지도 영역 조정
      try {
        const bounds = new window.kakao.maps.LatLngBounds();
        pathCoordinates.forEach(position => bounds.extend(position));
        kakaoMap.setBounds(bounds, { padding: 150 });
        console.log('지도 영역 조정 완료');
      } catch (error) {
        console.error('지도 영역 조정 중 오류:', error);
      }

      // 첫 번째 마커의 인포윈도우 표시
      if (newMarkers.length > 0) {
        newMarkers[0].infowindow.open(kakaoMap, newMarkers[0].marker);
      }

      console.log('경로 표시 완료:', {
        마커수: newMarkers.length,
        경로좌표수: pathCoordinates.length
      });
    } catch (error) {
      console.error('경로 표시 중 오류 발생:', error);
    }
  };

  // 경로 표시 초기화
  const clearRouteDisplay = () => {
    try {
      // 기존 폴리라인 제거
      polylines.forEach(polyline => {
        if (polyline) {
          polyline.setMap(null);
        }
      });
      setPolylines([]);

      console.log('경로 표시 초기화 완료');
    } catch (error) {
      console.error('경로 초기화 중 오류 발생:', error);
    }
  };

  // 경로 초기화 함수
  const resetRoute = () => {
    setOptimizedRoute([]);
    clearRouteDisplay();
  };

  // 최적화 기준 변경 함수
  const handleCriteriaChange = (e) => {
    setOptimizationCriteria(e.target.value);
    if (optimizedRoute.length > 0) {
      resetRoute();
    }
  };

  // 모든 데이터 초기화
  const resetAll = () => {
    resetRoute();
    setStartPoint(null);
    setEndPoint(null);
    
    markers.forEach(marker => {
      marker.marker.setMap(null);
      marker.infowindow.close();
    });
    
    setMarkers([]);
    setLocations([]);
  };

  // Enter 키 처리 함수
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchPlaces();
    }
  };

  // 검색 결과 항목 렌더링 수정
  const renderSearchResult = (result) => {
    const isStart = result.id === startPoint;
    const isEnd = result.id === endPoint;
    
    return (
      <li 
        key={result.id} 
        className="p-4 hover:bg-blue-50 cursor-pointer transition-colors duration-200 border-b last:border-b-0" 
        onClick={() => handleLocationSelect(result)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-grow space-y-2">
            {/* 상단 영역: 이름과 태그들 */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-lg text-gray-900">{result.name}</span>
              {isStart && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                  시작점
                </span>
              )}
              {isEnd && (
                <span className="px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded">
                  도착점
                </span>
              )}
            </div>
            
            {/* 주소 정보 영역 */}
            <div className="space-y-1.5 ml-1">
              {/* 도로명 주소 */}
              {result.roadAddress && (
                <div className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">도로명</span>
                  <span className="text-sm text-gray-700">{result.roadAddress}</span>
                </div>
              )}
              
              {/* 지번 주소 */}
              {result.address && result.address !== result.roadAddress && result.address !== result.name && (
                <div className="flex items-baseline gap-2">
                  <span className="flex-shrink-0 text-xs px-2 py-0.5 bg-yellow-50 text-yellow-600 rounded-full">지번</span>
                  <span className="text-sm text-gray-700">{result.address}</span>
                </div>
              )}
            </div>
          </div>
          
          {/* 추가 버튼 */}
          <button 
            className="ml-4 p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors duration-200"
            onClick={(e) => {
              e.stopPropagation();
              handleLocationSelect(result);
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </li>
    );
  };

  // 위치 목록 항목 렌더링 수정
  const renderLocationListItem = (loc, index) => {
    const isStart = loc.id === startPoint;
    const isEnd = loc.id === endPoint;
    
    return (
      <li key={loc.id} className="py-2 flex justify-between items-center">
        <span>
          <span className="font-semibold">{index + 1}.</span> {loc.name}
          {isStart && <span className="ml-2 text-blue-600">[시작점]</span>}
          {isEnd && <span className="ml-2 text-red-600">[도착점]</span>}
          <span className="text-gray-500 text-sm ml-2">
            ({loc.lat.toFixed(4)}, {loc.lng.toFixed(4)})
          </span>
        </span>
        <div>
          <button
            onClick={() => {
              if (isStart) {
                setStartPoint(null);
              } else {
                if (loc.id === endPoint) {
                  setEndPoint(null);
                }
                setStartPoint(loc.id);
              }
            }}
            className={`mr-2 px-3 py-1.5 rounded-md shadow-sm transition-all duration-200 active:shadow-inner active:translate-y-0.5 ${
              isStart 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' 
                : 'text-blue-600 hover:text-blue-800 border-2 border-blue-600 hover:bg-blue-50'
            }`}
          >
            {isStart ? '시작점 해제' : '시작점으로'}
          </button>
          <button
            onClick={() => {
              if (isEnd) {
                setEndPoint(null);
              } else {
                if (loc.id === startPoint) {
                  setStartPoint(null);
                }
                setEndPoint(loc.id);
              }
            }}
            className={`mr-2 px-3 py-1.5 rounded-md shadow-sm transition-all duration-200 active:shadow-inner active:translate-y-0.5 ${
              isEnd 
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' 
                : 'text-red-600 hover:text-red-800 border-2 border-red-600 hover:bg-red-50'
            }`}
          >
            {isEnd ? '도착점 해제' : '도착점으로'}
          </button>
          <button 
            onClick={() => removeLocation(loc.id)}
            className="text-gray-600 hover:text-gray-800 border-2 border-gray-600 hover:bg-gray-50 px-3 py-1.5 rounded-md shadow-sm transition-all duration-200 active:shadow-inner active:translate-y-0.5"
          >
            삭제
          </button>
        </div>
      </li>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">다중경로최적화 지도</h1>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-6">
          {/* 왼쪽 패널: 검색 및 컨트롤 */}
          <div className="lg:col-span-1 space-y-3 sm:space-y-6">
            {/* 검색 패널 */}
            <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="keyword">키워드 검색</option>
                    <option value="address">주소 검색</option>
                  </select>
                  <div className="flex gap-2 flex-1">
                    <input
                      type="text"
                      value={newLocation}
                      onChange={(e) => setNewLocation(e.target.value)}
                      placeholder={searchType === 'keyword' ? '장소명 입력' : '주소 입력'}
                      className="flex-grow px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      onKeyPress={handleKeyPress}
                    />
                    <button 
                      onClick={searchPlaces}
                      disabled={isSearching}
                      className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-all duration-200 flex-shrink-0 font-medium whitespace-nowrap shadow-md hover:shadow-lg active:shadow-inner active:translate-y-0.5"
                    >
                      {isSearching ? '검색 중' : '검색'}
                    </button>
                  </div>
                </div>

                {/* 검색 결과 */}
                {searchResults.length > 0 && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b">
                      <h3 className="text-sm font-medium text-gray-700">
                        검색 결과 ({searchResults.length}개)
                      </h3>
                    </div>
                    <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto">
                      <ul className="divide-y divide-gray-100">
                        {searchResults.map(result => renderSearchResult(result))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 최적화 설정 */}
            <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">최적화 기준</label>
              <select 
                value={optimizationCriteria}
                onChange={handleCriteriaChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="distance">거리</option>
                <option value="time">시간</option>
                <option value="cost">비용</option>
              </select>

              <div className="mt-3 space-y-2">
                <div className="relative group">
                  <button 
                    onClick={calculateOptimalRoute}
                    disabled={isCalculating || locations.length < 2 || !startPoint || !endPoint || !locations.find(loc => loc.id === startPoint) || !locations.find(loc => loc.id === endPoint)}
                    className={`w-full py-2.5 text-sm rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg active:shadow-inner active:translate-y-0.5 disabled:shadow-none disabled:hover:shadow-none disabled:active:translate-y-0 ${
                      isCalculating || locations.length < 2 || !startPoint || !endPoint || !locations.find(loc => loc.id === startPoint) || !locations.find(loc => loc.id === endPoint)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isCalculating ? '계산 중...' : '최적 경로 계산'}
                  </button>
                  {locations.length >= 2 && (!startPoint || !endPoint) && (
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                      {!startPoint && !endPoint ? '시작점과 도착점을 지정해주세요' :
                       !startPoint ? '시작점을 지정해주세요' :
                       '도착점을 지정해주세요'}
                    </div>
                  )}
                </div>
                <button 
                  onClick={resetRoute}
                  disabled={optimizedRoute.length === 0}
                  className="w-full py-2.5 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:bg-gray-300 transition-all duration-200 font-medium shadow-md hover:shadow-lg active:shadow-inner active:translate-y-0.5 disabled:shadow-none disabled:hover:shadow-none disabled:active:translate-y-0"
                >
                  경로 초기화
                </button>
                <button 
                  onClick={resetAll}
                  className="w-full py-2.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg active:shadow-inner active:translate-y-0.5"
                >
                  전체 초기화
                </button>
              </div>
            </div>

            {/* 위치 목록 */}
            <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-3">입력된 위치 목록</h2>
              {locations.length === 0 ? (
                <p className="text-gray-500 text-sm">추가된 위치가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-gray-100 space-y-2">
                  {locations.map((loc, index) => renderLocationListItem(loc, index))}
                </ul>
              )}
            </div>

            {/* 최적화된 경로 */}
            {optimizedRoute.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-3 sm:p-4">
                <h2 className="text-base sm:text-lg font-medium text-gray-900 mb-2">최적화된 경로</h2>
                <p className="text-sm text-gray-600 mb-3">
                  최적화 기준: <span className="font-medium">
                    {optimizationCriteria === 'distance' ? '최단 거리' : 
                     optimizationCriteria === 'time' ? '최소 시간' : '최소 비용'}
                  </span>
                </p>
                <div className="space-y-1 text-xs">
                  {optimizedRoute.map((loc, index) => (
                    <div key={index} className="flex items-center">
                      <div className="flex-shrink-0 w-4 text-gray-500">{index + 1}.</div>
                      <div className="flex-grow flex items-center">
                        <span className="text-gray-900">{loc.name}</span>
                        {index < optimizedRoute.length - 1 && (
                          <span className="text-gray-500 ml-1">
                            ({calculateDistance(loc, optimizedRoute[index + 1]).toFixed(1)}km)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t">
                  <p className="font-medium text-gray-900 text-sm">
                    총 거리: {optimizedRoute.reduce((total, loc, idx) => {
                      if (idx === optimizedRoute.length - 1) return total;
                      return total + calculateDistance(loc, optimizedRoute[idx + 1]);
                    }, 0).toFixed(1)} km
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽 패널: 지도 */}
          <div className="lg:col-span-2 h-[calc(100vh-12rem)] lg:h-[calc(100vh-8rem)]">
            <div className="bg-white rounded-lg shadow-sm border h-full p-0">
              <div 
                ref={mapRef} 
                className="w-full h-full"
                style={{ minHeight: '400px' }}
              >
                {!kakaoMap && (
                  <div className="h-full flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-500 text-sm">지도를 불러오는 중...</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiPathOptimizationMap;
