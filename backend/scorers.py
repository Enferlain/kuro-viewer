import cv2
import numpy as np
from PIL import Image
from sklearn.cluster import KMeans
import joblib
from sklearn.decomposition import PCA


class SimpleNoiseScorer:
    def __init__(self, kernel_size: int = 3, noise_threshold: float = 20.0):
        self.kernel_size = kernel_size
        self.noise_threshold = noise_threshold

    def _create_noise_map(self, image_bgr: np.ndarray) -> np.ndarray:
        denoised_img = cv2.medianBlur(image_bgr, self.kernel_size)
        original_int = image_bgr.astype(np.int16)
        denoised_int = denoised_img.astype(np.int16)
        noise_map = original_int - denoised_int
        noise_map_abs = np.abs(noise_map).astype(np.uint8)
        b, g, r = cv2.split(noise_map_abs)
        b_eq, g_eq, r_eq = cv2.equalizeHist(b), cv2.equalizeHist(g), cv2.equalizeHist(r)
        return cv2.merge([b_eq, g_eq, r_eq])

    def score(
        self, image: Image.Image
    ) -> tuple[float, Image.Image, Image.Image, float]:
        original_cv_bgr = cv2.cvtColor(
            np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR
        )

        # Without rembg, we just analyze the whole image or a center crop?
        # Let's analyze the whole image for now as a fallback.

        noise_map_bgr = self._create_noise_map(original_cv_bgr)
        noise_map_gray = cv2.cvtColor(noise_map_bgr, cv2.COLOR_BGR2GRAY)
        noise_level = np.mean(noise_map_gray)

        noise_score = 10.0 * (1.0 - min(noise_level / self.noise_threshold, 1.0))
        final_score = np.clip(noise_score, 0.0, 10.0)

        noise_map_pil = Image.fromarray(cv2.cvtColor(noise_map_bgr, cv2.COLOR_BGR2RGB))

        # Return same signature as original: score, isolated_bg (just original now), noise_map, raw_noise
        return float(final_score), image, noise_map_pil, noise_level


class PCAScorer:
    def __init__(self):
        pass

    def _pil_to_cv2(self, pil_image: Image.Image) -> np.ndarray:
        return cv2.cvtColor(np.array(pil_image.convert("RGB")), cv2.COLOR_RGB2BGR)

    def _equalize_float_v1(self, float_data):
        if float_data.size == 0:
            return float_data
        hist, bins = np.histogram(
            float_data.flatten(), bins=65536, range=(float_data.min(), float_data.max())
        )
        cdf = hist.cumsum()
        cdf_normalized = cdf / float(cdf.max())
        equalized_data = np.interp(float_data.flatten(), bins[:-1], cdf_normalized)
        return equalized_data

    def _enhance_component_v1(self, float_data):
        if float_data.size == 0:
            return float_data
        abs_data = np.abs(float_data)
        hist, bins = np.histogram(
            abs_data.flatten(), bins=65536, range=(abs_data.min(), abs_data.max())
        )
        cdf = hist.cumsum()
        cdf_normalized = cdf / float(cdf.max())
        equalized_data = np.interp(abs_data.flatten(), bins[:-1], cdf_normalized)
        return equalized_data

    def _luminance_gradient(self, img_rgb):
        gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
        sobel_x = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobel_y = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)

        sobel_x_norm = cv2.normalize(sobel_x, None, 0, 255, cv2.NORM_MINMAX)
        sobel_y_norm = cv2.normalize(sobel_y, None, 0, 255, cv2.NORM_MINMAX)
        return np.stack([gray, sobel_x_norm, sobel_y_norm], axis=-1).astype(np.uint8)

    def analyze_image_pca(
        self,
        img_bgr: np.ndarray,
        component: int = 1,
        mode: str = "projection",
        input_type: str = "color",
        linearize: bool = False,
        invert: bool = False,
        enhancement: str = "equalize",
        gamma: float = 1.0,
    ):
        if img_bgr.shape[2] == 4:
            alpha = img_bgr[:, :, 3]
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGRA2RGB)
            bg = np.zeros_like(img_rgb, dtype=np.uint8)
            alpha_f = alpha[:, :, np.newaxis].astype(np.float32) / 255.0
            img_rgb = (img_rgb * alpha_f + bg * (1 - alpha_f)).astype(np.uint8)
        else:
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

        h, w, c = img_rgb.shape
        mask = np.any(img_rgb > 0, axis=-1)
        mask_flat = mask.flatten()

        if input_type == "color":
            source_img_for_pca = img_rgb
        elif input_type == "luminance_gradient":
            source_img_for_pca = self._luminance_gradient(img_rgb)
        else:
            raise ValueError("input_type must be 'color' or 'luminance_gradient'")

        pixel_data = source_img_for_pca.reshape((h * w, c)).astype(np.float64) / 255.0
        if linearize:
            pixel_data = np.power(pixel_data, 2.2)

        pca = PCA(n_components=3)
        projected_data = pca.fit_transform(pixel_data)

        comp_idx = component - 1
        output_image_float_flat = projected_data[:, comp_idx]

        if output_image_float_flat is None:
            return np.zeros((h, w), dtype=np.uint8)

        final_image_float = np.zeros_like(output_image_float_flat)
        pixels_of_interest = output_image_float_flat[mask_flat]

        if enhancement == "equalize":
            if component == 1:
                enhanced_poi = self._equalize_float_v1(pixels_of_interest)
            else:
                enhanced_poi = self._enhance_component_v1(pixels_of_interest)
            final_image_float[mask_flat] = enhanced_poi
        else:
            if pixels_of_interest.size > 0:
                min_val, max_val = pixels_of_interest.min(), pixels_of_interest.max()
                if max_val > min_val:
                    final_image_float[mask_flat] = (pixels_of_interest - min_val) / (
                        max_val - min_val
                    )

        if gamma != 1.0:
            final_image_float = np.power(final_image_float, gamma)

        output_image_uint8 = (final_image_float.reshape(h, w) * 255).astype(np.uint8)

        if invert:
            output_image_uint8 = 255 - output_image_uint8

        return output_image_uint8

    def score(
        self,
        image: Image.Image,
        component: int = 1,
        mode: str = "projection",
        input_type: str = "color",
        linearize: bool = False,
        invert: bool = False,
        enhancement: str = "equalize",
        gamma: float = 1.0,
    ) -> float:
        cv2_image = self._pil_to_cv2(image)

        pca_result = self.analyze_image_pca(
            cv2_image,
            component=component,
            mode=mode,
            input_type=input_type,
            linearize=linearize,
            invert=invert,
            enhancement=enhancement,
            gamma=gamma,
        )

        score = 10.0 - (np.mean(pca_result) / 25.5)

        return float(np.clip(score, 0.0, 10.0))
